(function(){
var $=function(i){return document.getElementById(i)};
var K="rf_admin",cfg={},F=[],HM={},editing=null,photoData=null,slugTouched=false,pageHtml=null,curFile=null;
var P=window.RFPages;

/* The page/publish helpers normally load from admin.html. If they did not (file not uploaded,
   or an old admin.html is cached) load them here, or say clearly what is missing. */
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=function(){rej(new Error(src))};document.head.appendChild(s)})}
function ensureLibs(){
  var p=Promise.resolve();
  if(!window.RFPages)p=p.then(function(){return loadScript("founder-pages.js?v=2")});
  if(!window.RFPublish)p=p.then(function(){return loadScript("founder-publish.js?v=2")});
  return p.then(function(){P=window.RFPages;if(!window.RFPages||!window.RFPublish)throw new Error("founder-pages.js")}).catch(function(e){
    var x=new Error("Could not load "+String(e.message).split("?")[0]+". Upload founder-pages.js and founder-publish.js to the same folder as admin.html on GitHub, wait a minute, then reload this page with Ctrl+F5.");
    x.friendly=true;throw x;
  });
}

/* ---------- settings ---------- */
try{cfg=JSON.parse(localStorage.getItem(K)||"{}")}catch(e){}
["owner","repo","branch","token"].forEach(function(k){if(cfg[k])$(k).value=cfg[k]});

function say(id,msg,cls){var e=$(id);e.textContent=msg;e.className=cls||""}
function pub(){return window.RFPublish.create(cfg)}
function errText(e){
  if(e&&e.friendly)return e.message;
  if(e.status===401)return "Token rejected. Check the token and try again.";
  if(e.status===403)return "Access denied. The token needs Contents: Read and write on this repository.";
  if(e.status===404)return "Repository or branch not found. Check username, repository and branch.";
  if(e.status===409||e.status===422)return "The site changed while you were publishing, so nothing was saved. Click Connect & load founders, then try again.";
  return "Error: "+(e.message||e);
}
function refresh(){
  return Promise.all([pub().load(),pub().historyMap()]).then(function(r){F=r[0];HM=r[1]||{}});
}

/* ---------- connect ---------- */
$("btnConnect").onclick=function(){
  cfg={owner:$("owner").value.trim(),repo:$("repo").value.trim(),branch:$("branch").value.trim()||"main",token:$("token").value.trim()};
  if(!cfg.owner||!cfg.repo||!cfg.token){say("cstatus","Enter username, repository and token.","err");return}
  say("cstatus","Connecting…");
  ensureLibs().then(refresh).then(function(){
    try{localStorage.setItem(K,JSON.stringify(cfg))}catch(e){}
    say("cstatus","Connected. "+F.length+" founders loaded.","ok");
    $("formCard").hidden=false;$("listCard").hidden=false;renderList();
  }).catch(function(e){say("cstatus",errText(e),"err")});
};
$("btnForget").onclick=function(){try{localStorage.removeItem(K)}catch(e){}$("token").value="";$("formCard").hidden=true;$("listCard").hidden=true;say("cstatus","Token removed from this browser.")};
if(cfg.token)$("btnConnect").click();

/* ---------- photo handling ---------- */
function resize(file){
  return new Promise(function(res,rej){
    var r=new FileReader();r.onerror=rej;
    r.onload=function(){var im=new Image();im.onerror=rej;im.onload=function(){
      var M=900,s=Math.min(1,M/Math.max(im.width,im.height)),c=document.createElement("canvas");
      c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);
      c.getContext("2d").drawImage(im,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.85))};im.src=r.result};
    r.readAsDataURL(file);
  });
}
$("photo").onchange=function(){
  var f=this.files[0];photoData=null;$("preview").style.display="none";if(!f)return;
  resize(f).then(function(d){photoData=d;$("preview").src=d;$("preview").style.display="block"}).catch(function(){say("status","That photo could not be read. Try a JPG or PNG.","err")});
};

/* ---------- History page (uploaded, ready-made .html file) ---------- */
function slugPreview(){var s=$("slug").value.trim();$("slugprev").textContent=s?"https://rajafounder.com/"+s+".html":""}
function togglePage(){$("pagefields").hidden=!$("mkpage").checked}
function labelPreview(){$("hprev").textContent=$("hlabel").value.trim()||"History"}
$("mkpage").onchange=togglePage;
$("hlabel").oninput=labelPreview;
$("slug").oninput=function(){slugTouched=true;this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,"-");slugPreview()};
$("n").oninput=function(){if(!slugTouched&&!editing&&!pageHtml){$("slug").value=P.slugify(this.value);slugPreview()}};

$("pfile").onchange=function(){
  var inp=this,f=inp.files[0];pageHtml=null;$("pfileinfo").textContent="";say("pstatus","");
  if(!f)return;
  if(!/\.html?$/i.test(f.name)){say("pstatus","Please choose an .html file.","err");inp.value="";return}
  if(f.size>2*1024*1024){say("pstatus","That file is larger than 2 MB. Please use a smaller page.","err");inp.value="";return}
  f.text().then(function(t){
    if(!/<html[\s>]/i.test(t)&&!/<!doctype\s+html/i.test(t)){say("pstatus","That file does not look like a web page (.html).","err");inp.value="";return}
    pageHtml=t;
    $("pfileinfo").textContent=f.name+" ("+Math.max(1,Math.round(f.size/1024))+" KB) is ready to publish.";
    /* page address: taken from the file name, unless this founder already has a page address */
    if(!curFile&&!slugTouched){var s=P.slugify(f.name.replace(/\.html?$/i,""));if(s){$("slug").value=s;slugPreview()}}
  }).catch(function(){say("pstatus","That file could not be read.","err");inp.value=""});
};

function pageInputs(){return{make:$("mkpage").checked&&!!pageHtml,wants:$("mkpage").checked,slug:$("slug").value.trim(),html:pageHtml,label:$("hlabel").value.trim()}}

/* Preview: shows the uploaded file (or the live page) in a new tab. Nothing is published. */
$("btnPreview").onclick=function(){
  if(!pageHtml){
    if(curFile){window.open("https://rajafounder.com/"+curFile,"_blank","noopener");return}
    say("pstatus","Choose the page file first.","err");return;
  }
  var html=pageHtml.replace(/<script[\s\S]*?<\/script>/gi,"");
  html=/<head[^>]*>/i.test(html)?html.replace(/<head[^>]*>/i,function(m){return m+'<base href="https://rajafounder.com/">'}):'<base href="https://rajafounder.com/">'+html;
  var url=URL.createObjectURL(new Blob([html],{type:"text/html"}));
  var w=window.open(url,"_blank");
  if(!w){say("pstatus","Allow pop-ups for this page to see the preview.","err");return}
  setTimeout(function(){URL.revokeObjectURL(url)},60000);
  say("pstatus","Preview opened in a new tab. Nothing has been published.","ok");
};

/* ---------- form ---------- */
var FIELDS=["n","co","c","ind","yr","role","web","li","bio","story"];
var HINT_NEW="Upload the ready-made page you created for this founder (.html). It is saved exactly as it is, and the <b>History</b> button in the home-page pop-up links to it. <b>script.js</b>, <b>index.html</b> and <b>sitemap.xml</b> are updated automatically.";
function resetForm(){
  editing=null;photoData=null;slugTouched=false;pageHtml=null;curFile=null;
  FIELDS.concat(["slug","hlabel"]).forEach(function(k){$(k).value=""});
  $("slug").disabled=false;$("pfile").value="";$("pfileinfo").textContent="";
  $("photo").value="";$("preview").style.display="none";$("mkpage").checked=true;togglePage();slugPreview();labelPreview();
  $("formTitle").textContent="2. Add a new founder";$("btnSave").textContent="Publish founder";$("btnCancel").hidden=true;$("photoNote").textContent="*";
  $("pagehint").innerHTML=HINT_NEW;
  say("pstatus","");
}
$("btnCancel").onclick=function(){resetForm();say("status","")};
function validUrl(u){return !u||/^https?:\/\//i.test(u)}

$("btnSave").onclick=function(){
  var o={};FIELDS.forEach(function(k){o[k]=$(k).value.trim()});
  var pg=pageInputs();
  if(!o.n||!o.co||!o.c||!o.ind){say("status","Enter name, company, country and industry.","err");return}
  if(!validUrl(o.web)||!validUrl(o.li)){say("status","Website and LinkedIn must start with http:// or https://","err");return}
  var cur=editing?F.filter(function(f){return f.id===editing})[0]:null;
  if(!cur&&!photoData){say("status","Choose a photo for the new founder.","err");return}
  if(pg.make){
    if(!P.validSlug(pg.slug)){say("status","Page address: use lowercase letters, numbers and hyphens only (for example jane-doe).","err");return}
    if(curFile&&!confirm("This replaces the current History page ("+curFile+") with the file you chose. Continue?"))return;
  }else if(pg.wants&&!curFile&&!pageHtml&&pg.label){
    /* nothing to link yet: label alone is saved but no button appears until a page exists */
  }
  var btn=$("btnSave");btn.disabled=true;say("status","Publishing…");
  pub().publish(o,{editingId:editing,photoData:photoData,page:pg}).then(function(r){
    F=r.list;if(r.record.history)HM[r.record.n]=r.record.history;
    return pub().historyMap().then(function(m){HM=m},function(){});
  }).then(function(){
    var had=pg.make;resetForm();renderList();
    say("status",had?"Published. Founder, History page, History button, script.js, index.html and sitemap.xml were updated in one step. The live site updates in about a minute.":"Published. The live site updates in about a minute.","ok");
  }).catch(function(e){say("status",errText(e),"err")}).then(function(){btn.disabled=false});
};

/* ---------- list ---------- */
function startEdit(f,toHistory){
  editing=f.id;photoData=null;slugTouched=true;pageHtml=null;
  FIELDS.forEach(function(k){$(k).value=f[k]==null?"":f[k]});
  $("hlabel").value=f.historyLabel||"";labelPreview();
  $("pfile").value="";$("pfileinfo").textContent="";
  $("photo").value="";$("preview").style.display="none";$("photoNote").textContent="(leave empty to keep current photo)";
  $("formTitle").textContent="Edit founder";$("btnSave").textContent="Save changes";$("btnCancel").hidden=false;say("pstatus","");
  var file=f.history||HM[f.n]||null;curFile=file;
  if(file){
    $("slug").value=file.replace(/\.html$/,"");$("slug").disabled=true;$("mkpage").checked=true;
    $("pagehint").innerHTML="Current History page: <b>"+P.esc(file)+"</b>. It stays exactly as it is. To replace it, choose a new .html file below (it is saved under the same address).";
  }else{
    $("slug").value=P.slugify(f.n);$("slug").disabled=false;$("mkpage").checked=false;slugTouched=false;
    $("pagehint").innerHTML="This founder has no History page yet. Tick the box and upload the ready-made page to add the History button.";
  }
  togglePage();slugPreview();
  (toHistory?$("pagebox"):$("formCard")).scrollIntoView({behavior:"smooth"});
  if(toHistory&&!file)$("mkpage").checked=true,togglePage();
}

function renderList(){
  var box=$("list");box.innerHTML="";$("count").textContent=F.length;
  F.forEach(function(f){
    var d=document.createElement("div");d.className="item";
    d.innerHTML='<img alt=""><span></span><button class="sec" type="button">Edit</button><button class="sec" type="button">History</button><button class="del" type="button">Delete</button>';
    d.querySelector("img").src="https://raw.githubusercontent.com/"+cfg.owner+"/"+cfg.repo+"/"+cfg.branch+"/"+f.photo+"?t="+Date.now();
    var sp=d.querySelector("span");sp.textContent=f.n+" – "+f.co+", "+f.c;
    var file=f.history||HM[f.n];
    if(file){var a=document.createElement("a");a.className="tag";a.textContent="page";a.href="https://rajafounder.com/"+file;a.target="_blank";a.rel="noopener";sp.appendChild(a)}
    var b=d.querySelectorAll("button");
    b[0].onclick=function(){startEdit(f)};
    b[1].textContent=file?"History":"+ History";
    b[1].onclick=function(){startEdit(f,true)};
    b[2].onclick=function(){
      if(b[2].textContent!=="Confirm delete"){b[2].textContent="Confirm delete";return}
      b[2].disabled=true;say("status","Deleting…");
      pub().remove(f.id).then(function(r){
        F=r.list;delete HM[f.n];renderList();
        say("status","Deleted"+(r.keptPage?" (the hand-made page "+r.keptPage+" was kept)":"")+". The live site updates in about a minute.","ok");
      }).catch(function(e){b[2].disabled=false;say("status",errText(e),"err")});
    };
    box.appendChild(d);
  });
}
togglePage();labelPreview();
})();
