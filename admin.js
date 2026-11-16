(function(){
var $=function(i){return document.getElementById(i)};
var K="rf_admin",cfg={},F=[],HM={},editing=null,photoData=null,slugTouched=false;
var P=window.RFPages;

/* The page/publish helpers normally load from admin.html. If they did not (file not uploaded,
   or an old admin.html is cached) load them here, or say clearly what is missing. */
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=function(){rej(new Error(src))};document.head.appendChild(s)})}
function ensureLibs(){
  var p=Promise.resolve();
  if(!window.RFPages)p=p.then(function(){return loadScript("founder-pages.js?v=1")});
  if(!window.RFPublish)p=p.then(function(){return loadScript("founder-publish.js?v=1")});
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

/* ---------- life-story page fields ---------- */
function slugPreview(){var s=$("slug").value.trim();$("slugprev").textContent=s?"https://rajafounder.com/"+s+".html":""}
function togglePage(){$("pagefields").hidden=!$("mkpage").checked}
$("mkpage").onchange=togglePage;
$("slug").oninput=function(){slugTouched=true;this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,"-");slugPreview()};
$("n").oninput=function(){if(!slugTouched&&!editing){$("slug").value=P.slugify(this.value);slugPreview()}};
$("btnExample").onclick=function(){
  if($("psrc").value.trim()&&!confirm("Replace the current page content with the example layout?"))return;
  $("psrc").value=P.EXAMPLE;
};

function pageInputs(){return{make:$("mkpage").checked,slug:$("slug").value.trim(),born:$("born").value.trim(),known:$("known").value.trim(),source:$("psrc").value}}

/* Preview: opens the finished page in a new tab without publishing anything */
$("btnPreview").onclick=function(){
  var o={};FIELDS.forEach(function(k){o[k]=$(k).value.trim()});
  var pg=pageInputs();
  if(!o.n||!o.bio){say("pstatus","Enter the name and short description first.","err");return}
  var w=window.open("","_blank");
  if(!w){say("pstatus","Allow pop-ups for this page to see the preview.","err");return}
  w.document.write("<p style='font-family:sans-serif'>Building preview…</p>");
  say("pstatus","Building preview…");
  pub().getTemplate().then(function(tpl){
    var cur=editing?F.filter(function(f){return f.id===editing})[0]:null;
    var rec={n:o.n,co:o.co,c:o.c,ind:o.ind,role:o.role||"Founder",bio:o.bio,photo:photoData?"photos/preview-photo.jpg":(cur&&cur.photo)||"hero-1.jpg"};
    var html=P.buildPage(tpl,rec,{slug:pg.slug||P.slugify(o.n)||"preview",born:pg.born,known:pg.known,source:pg.source});
    if(photoData)html=html.split('src="photos/preview-photo.jpg"').join('src="'+photoData+'"');
    html=html.replace(/<script[\s\S]*?<\/script>/g,"").replace("<head>",'<head><base href="https://rajafounder.com/">');
    w.document.open();w.document.write(html);w.document.close();
    say("pstatus","Preview opened in a new tab. Nothing has been published.","ok");
  }).catch(function(e){w.close();say("pstatus",errText(e),"err")});
};

/* ---------- form ---------- */
var FIELDS=["n","co","c","ind","yr","role","web","li","bio","story"];
function resetForm(){
  editing=null;photoData=null;slugTouched=false;
  FIELDS.concat(["slug","born","known","psrc"]).forEach(function(k){$(k).value=""});
  $("photo").value="";$("preview").style.display="none";$("mkpage").checked=true;togglePage();slugPreview();
  $("formTitle").textContent="2. Add a new founder";$("btnSave").textContent="Publish founder";$("btnCancel").hidden=true;$("photoNote").textContent="*";
  $("pagehint").innerHTML="Publishing builds the page from the template and, in the same step, updates <b>script.js</b>, <b>index.html</b> (History button) and <b>sitemap.xml</b>.";
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
    if(!o.bio){say("status","Add a short description. It is used as the intro of the page.","err");return}
    if(!P.validSlug(pg.slug)){say("status","Page address: use lowercase letters, numbers and hyphens only (for example jane-doe).","err");return}
    if(!pg.source.trim()){say("status","Add some page content, or untick the life-story page box.","err");return}
  }
  var btn=$("btnSave");btn.disabled=true;say("status","Publishing…");
  pub().publish(o,{editingId:editing,photoData:photoData,page:pg}).then(function(r){
    F=r.list;if(r.record.history)HM[r.record.n]=r.record.history;
    return pub().historyMap().then(function(m){HM=m},function(){});
  }).then(function(){
    var had=pg.make;resetForm();renderList();
    say("status",had?"Published. Founder, page, script.js, index.html and sitemap.xml were updated in one step. The live site updates in about a minute.":"Published. The live site updates in about a minute.","ok");
  }).catch(function(e){say("status",errText(e),"err")}).then(function(){btn.disabled=false});
};

/* ---------- list ---------- */
function startEdit(f){
  editing=f.id;photoData=null;slugTouched=true;
  FIELDS.forEach(function(k){$(k).value=f[k]==null?"":f[k]});
  ["slug","born","known","psrc"].forEach(function(k){$(k).value=""});
  $("photo").value="";$("preview").style.display="none";$("photoNote").textContent="(leave empty to keep current photo)";
  $("formTitle").textContent="Edit founder";$("btnSave").textContent="Save changes";$("btnCancel").hidden=false;say("pstatus","");
  var file=f.history||HM[f.n]||null;
  if(file&&f.pageAuto){
    var slug=file.replace(/\.html$/,"");
    $("mkpage").checked=true;$("slug").value=slug;
    $("pagehint").textContent="This page was created here ("+file+"). Saving rebuilds it from the content below.";
    say("pstatus","Loading page content…");
    pub().readPageSource(slug).then(function(s){
      if(editing!==f.id)return;
      if(s){$("born").value=s.born||"";$("known").value=s.known||"";$("psrc").value=s.source||"";say("pstatus","")}
      else say("pstatus","The saved page text was not found. Paste the content again before saving.","err");
    }).catch(function(e){say("pstatus",errText(e),"err")});
  }else if(file){
    $("mkpage").checked=false;$("slug").value=file.replace(/\.html$/,"");
    $("pagehint").innerHTML="This founder already has a hand-made page (<b>"+P.esc(file)+"</b>). It stays exactly as it is unless you tick the box, which replaces it with a page built from the content below.";
  }else{
    $("mkpage").checked=true;$("slug").value=P.slugify(f.n);
    $("pagehint").textContent="This founder has no life-story page yet. Fill in the content below to create one.";
  }
  togglePage();slugPreview();
  $("formCard").scrollIntoView({behavior:"smooth"});
}

function renderList(){
  var box=$("list");box.innerHTML="";$("count").textContent=F.length;
  F.forEach(function(f){
    var d=document.createElement("div");d.className="item";
    d.innerHTML='<img alt=""><span></span><button class="sec" type="button">Edit</button><button class="del" type="button">Delete</button>';
    d.querySelector("img").src="https://raw.githubusercontent.com/"+cfg.owner+"/"+cfg.repo+"/"+cfg.branch+"/"+f.photo+"?t="+Date.now();
    var sp=d.querySelector("span");sp.textContent=f.n+" – "+f.co+", "+f.c;
    var file=f.history||HM[f.n];
    if(file){var a=document.createElement("a");a.className="tag";a.textContent="page";a.href="https://rajafounder.com/"+file;a.target="_blank";a.rel="noopener";sp.appendChild(a)}
    var b=d.querySelectorAll("button");
    b[0].onclick=function(){startEdit(f)};
    b[1].onclick=function(){
      if(b[1].textContent!=="Confirm delete"){b[1].textContent="Confirm delete";return}
      b[1].disabled=true;say("status","Deleting…");
      pub().remove(f.id).then(function(r){
        F=r.list;delete HM[f.n];renderList();
        say("status","Deleted"+(r.keptPage?" (the hand-made page "+r.keptPage+" was kept)":"")+". The live site updates in about a minute.","ok");
      }).catch(function(e){b[1].disabled=false;say("status",errText(e),"err")});
    };
    box.appendChild(d);
  });
}
togglePage();
})();
