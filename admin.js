(function(){
var $=function(i){return document.getElementById(i)};
var K="rf_admin",cfg={},F=[],sha=null,editing=null,photoData=null;

/* ---------- settings ---------- */
try{cfg=JSON.parse(localStorage.getItem(K)||"{}")}catch(e){}
["owner","repo","branch","token"].forEach(function(k){if(cfg[k])$(k).value=cfg[k]});

function say(id,msg,cls){var e=$(id);e.textContent=msg;e.className=cls||""}
function utf8b64(s){return btoa(unescape(encodeURIComponent(s)))}
function b64utf8(s){return decodeURIComponent(escape(atob(s.replace(/\s/g,""))))}

/* ---------- GitHub API ---------- */
function api(path,opt){
  opt=opt||{};
  var url="https://api.github.com/repos/"+cfg.owner+"/"+cfg.repo+"/contents/"+path;
  if(!opt.method||opt.method==="GET")url+="?ref="+encodeURIComponent(cfg.branch)+"&t="+Date.now();
  return fetch(url,{method:opt.method||"GET",headers:{"Authorization":"Bearer "+cfg.token,"Accept":"application/vnd.github+json"},body:opt.body?JSON.stringify(opt.body):undefined})
    .then(function(r){return r.json().catch(function(){return{}}).then(function(j){if(!r.ok){var e=new Error(j.message||r.status);e.status=r.status;throw e}return j})});
}
function loadFounders(){
  return api("founders.json").then(function(j){sha=j.sha;F=JSON.parse(b64utf8(j.content));if(!Array.isArray(F))F=[]})
    .catch(function(e){if(e.status===404){sha=null;F=[]}else throw e});
}
function saveFounders(msg){
  return api("founders.json",{method:"PUT",body:{message:msg,content:utf8b64(JSON.stringify(F,null,2)),branch:cfg.branch,sha:sha||undefined}})
    .then(function(j){sha=j.content.sha});
}
function uploadPhoto(path,dataUrl){
  return api(path,{method:"PUT",body:{message:"Add photo "+path,content:dataUrl.split(",")[1],branch:cfg.branch}});
}
function deletePhoto(path){
  return api(path).then(function(j){return api(path,{method:"DELETE",body:{message:"Remove photo "+path,sha:j.sha,branch:cfg.branch}})}).catch(function(){});
}
function errText(e){
  if(e.status===401)return "Token rejected. Check the token and try again.";
  if(e.status===403)return "Access denied. The token needs Contents: Read and write on this repository.";
  if(e.status===404)return "Repository or branch not found. Check username, repository and branch.";
  if(e.status===409||e.status===422)return "The site changed while you were editing. Click Connect & load founders, then try again.";
  return "Error: "+(e.message||e);
}

/* ---------- connect ---------- */
$("btnConnect").onclick=function(){
  cfg={owner:$("owner").value.trim(),repo:$("repo").value.trim(),branch:$("branch").value.trim()||"main",token:$("token").value.trim()};
  if(!cfg.owner||!cfg.repo||!cfg.token){say("cstatus","Enter username, repository and token.","err");return}
  say("cstatus","Connecting…");
  loadFounders().then(function(){
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

/* ---------- form ---------- */
var FIELDS=["n","co","c","ind","yr","role","web","li","bio","story"];
function resetForm(){
  editing=null;photoData=null;FIELDS.forEach(function(k){$(k).value=""});$("photo").value="";$("preview").style.display="none";
  $("formTitle").textContent="2. Add a new founder";$("btnSave").textContent="Publish founder";$("btnCancel").hidden=true;$("photoNote").textContent="*";
}
$("btnCancel").onclick=function(){resetForm();say("status","")};
function validUrl(u){return !u||/^https?:\/\//i.test(u)}

$("btnSave").onclick=function(){
  var o={};FIELDS.forEach(function(k){o[k]=$(k).value.trim()});
  if(!o.n||!o.co||!o.c||!o.ind){say("status","Enter name, company, country and industry.","err");return}
  if(!validUrl(o.web)||!validUrl(o.li)){say("status","Website and LinkedIn must start with http:// or https://","err");return}
  var cur=editing?F.filter(function(f){return f.id===editing})[0]:null;
  if(!cur&&!photoData){say("status","Choose a photo for the new founder.","err");return}
  var btn=$("btnSave");btn.disabled=true;say("status","Publishing…");
  var id=cur?cur.id:"f"+Date.now(),oldPhoto=cur?cur.photo:null,photo=oldPhoto,step=Promise.resolve();
  if(photoData){photo="photos/"+id+"-"+Date.now()+".jpg";step=uploadPhoto(photo,photoData)}
  step.then(function(){
    var rec={id:id,n:o.n,co:o.co,c:o.c,ind:o.ind,yr:parseInt(o.yr,10)||"",role:o.role||"Founder",bio:o.bio,story:o.story,photo:photo,web:o.web,li:o.li};
    if(cur)F[F.indexOf(cur)]=rec;else F.push(rec);
    return saveFounders((cur?"Update founder ":"Add founder ")+o.n);
  }).then(function(){
    if(photoData&&oldPhoto&&oldPhoto.indexOf("photos/")===0)deletePhoto(oldPhoto);
    resetForm();renderList();say("status","Published. The live site updates in about a minute.","ok");
  }).catch(function(e){say("status",errText(e),"err")}).then(function(){btn.disabled=false});
};

/* ---------- list ---------- */
function renderList(){
  var box=$("list");box.innerHTML="";$("count").textContent=F.length;
  F.forEach(function(f){
    var d=document.createElement("div");d.className="item";
    d.innerHTML='<img alt=""><span></span><button class="sec" type="button">Edit</button><button class="del" type="button">Delete</button>';
    d.querySelector("img").src="https://raw.githubusercontent.com/"+cfg.owner+"/"+cfg.repo+"/"+cfg.branch+"/"+f.photo+"?t="+Date.now();
    d.querySelector("span").textContent=f.n+" – "+f.co+", "+f.c;
    var b=d.querySelectorAll("button");
    b[0].onclick=function(){
      editing=f.id;photoData=null;FIELDS.forEach(function(k){$(k).value=f[k]==null?"":f[k]});
      $("photo").value="";$("preview").style.display="none";$("photoNote").textContent="(leave empty to keep current photo)";
      $("formTitle").textContent="Edit founder";$("btnSave").textContent="Save changes";$("btnCancel").hidden=false;
      $("formCard").scrollIntoView({behavior:"smooth"});
    };
    b[1].onclick=function(){
      if(b[1].textContent!=="Confirm delete"){b[1].textContent="Confirm delete";return}
      b[1].disabled=true;say("status","Deleting…");
      var keep=F.slice();F=F.filter(function(x){return x.id!==f.id});
      saveFounders("Delete founder "+f.n).then(function(){
        if(f.photo&&f.photo.indexOf("photos/")===0&&!/^photos\/s\d\.jpg$/.test(f.photo))deletePhoto(f.photo);
        renderList();say("status","Deleted. The live site updates in about a minute.","ok");
      }).catch(function(e){F=keep;b[1].disabled=false;say("status",errText(e),"err")});
    };
    box.appendChild(d);
  });
}
})();
