var T=document.querySelectorAll("#founders .tile img");
var F=JSON.parse(document.getElementById("fdata").textContent);
F.forEach(function(f){if(f.tile!=null)f.photo=T[f.tile].src});
var $=function(i){return document.getElementById(i)};
function opts(sel,key){F.map(function(f){return f[key]}).filter(function(v,i,a){return a.indexOf(v)===i}).sort().forEach(function(v){var o=document.createElement("option");o.value=v;o.textContent=v;sel.appendChild(o)})}
opts($("fc"),"c");opts($("fi"),"ind");
function render(){
  var q=$("q").value.trim().toLowerCase(),c=$("fc").value,n=$("fi").value,box=$("cards");
  var list=F.map(function(f,i){return i}).filter(function(i){var f=F[i];
    return (!c||f.c===c)&&(!n||f.ind===n)&&(!q||(f.n+" "+f.co+" "+f.c+" "+f.ind).toLowerCase().indexOf(q)>-1)});
  box.innerHTML="";
  list.forEach(function(i){var f=F[i],b=document.createElement("button");b.className="card";b.type="button";
    b.innerHTML='<img alt=""><div class="ci"><b></b><span></span><span></span></div>';
    b.querySelector("img").src=f.photo;b.querySelector("b").textContent=f.n;
    var sp=b.querySelectorAll("span");sp[0].textContent=f.co;sp[1].textContent=f.c+" · "+f.ind;
    b.addEventListener("click",function(){openP(i)});box.appendChild(b)});
  if(!list.length){var e=document.createElement("div");e.className="empty";e.textContent="No founders match your search. Clear the filters or try a different name.";box.appendChild(e)}
  $("cnt").textContent=list.length+" of "+F.length+" founders shown";
}
function openP(i){var f=F[i];$("pi").src=f.photo;$("pi").alt=f.n;$("pn").textContent=f.n;$("pr").textContent=f.role+", "+f.co;
  $("pd").innerHTML="";[["Country",f.c],["Industry",f.ind],["Founded",f.yr]].forEach(function(r){var a=document.createElement("dt"),b=document.createElement("dd");a.textContent=r[0];b.textContent=r[1];$("pd").appendChild(a);$("pd").appendChild(b)});
  $("pb").textContent=f.bio;$("ps").textContent=f.story;$("dlg").showModal()}
$("q").addEventListener("input",render);$("fc").addEventListener("change",render);$("fi").addEventListener("change",render);
$("cl").addEventListener("click",function(){$("dlg").close()});
$("dlg").addEventListener("click",function(e){if(e.target===$("dlg"))$("dlg").close()});
var map=["s1","s2","s4","s3"].map(function(id){return F.findIndex(function(f){return f.id===id})});
function openT(k){if(map[k]>-1)openP(map[k])}
document.querySelectorAll("#founders .tile").forEach(function(t,k){t.tabIndex=0;t.setAttribute("role","button");t.setAttribute("aria-label","Open profile of "+(F[map[k]]||{n:"this founder"}).n);
  t.addEventListener("click",function(){openT(k)});t.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();openT(k)}})});
var ed=null,AR=null;
function $v(i){return $(i).value.trim()}
function toUri(file){return new Promise(function(res,rej){var r=new FileReader();r.onerror=rej;r.onload=function(){var im=new Image();im.onerror=rej;im.onload=function(){var W=480,H=400,sw=im.width,sh=im.height;if(sw/sh>W/H)sw=sh*W/H;else sh=sw*H/W;var c=document.createElement("canvas");c.width=W;c.height=H;c.getContext("2d").drawImage(im,(im.width-sw)/2,0,sw,sh,0,0,W,H);res(c.toDataURL("image/jpeg",.75))};im.src=r.result};r.readAsDataURL(file)})}
function clr(){ed=null;["an","aco","acn","ain","ayr","arl","abio","asty","aph"].forEach(function(i){$(i).value=""});$("asv").textContent="Add founder";$("acx").hidden=true}
function alist(){var b=$("alist");b.innerHTML="";F.forEach(function(f){var r=document.createElement("div");r.className="ar";r.innerHTML='<img alt=""><span></span><button type="button">Edit</button><button type="button">Delete</button>';
  r.querySelector("img").src=f.photo;r.querySelector("span").textContent=f.n+" – "+f.co+", "+f.c;
  var bt=r.querySelectorAll("button");
  bt[0].onclick=function(){ed=f.id;$("an").value=f.n;$("aco").value=f.co;$("acn").value=f.c;$("ain").value=f.ind;$("ayr").value=f.yr;$("arl").value=f.role;$("abio").value=f.bio;$("asty").value=f.story;$("asv").textContent="Save changes";$("acx").hidden=false;$("an").focus()};
  bt[1].onclick=function(){if(bt[1].textContent!=="Confirm delete"){bt[1].textContent="Confirm delete";return}F=F.filter(function(x){return x.id!==f.id});persist("Founder deleted. Publishing…")};
  b.appendChild(r)})}
async function persist(msg){var st=$("astat");st.textContent=msg||"Publishing…";
  var c=document.documentElement.cloneNode(true);
  c.querySelector("#fdata").textContent=JSON.stringify(F.map(function(f){var o=Object.assign({},f);if(o.tile!=null)delete o.photo;return o})).replace(/</g,"\\u003c");
  c.querySelector("#cards").innerHTML="";c.querySelector("#alist").innerHTML="";
  c.querySelectorAll("#fc option:not(:first-child),#fi option:not(:first-child)").forEach(function(o){o.remove()});
  c.querySelector("#dlg").removeAttribute("open");c.querySelector("#adlg").removeAttribute("open");c.querySelector("#pi").removeAttribute("src");c.querySelector("#adm").setAttribute("hidden","");
  try{await AR.publish("<!DOCTYPE html>\n"+c.outerHTML);st.textContent="Published."}catch(e){st.textContent="Could not publish ("+((e&&e.code)||"error")+"). Reload the page and try again."}}
$("asv").addEventListener("click",async function(){var st=$("astat"),n=$v("an"),co=$v("aco"),cn=$v("acn"),ind=$v("ain");
  if(!n||!co||!cn||!ind){st.textContent="Enter name, company, country and industry.";return}
  var cur=ed?F.find(function(x){return x.id===ed}):null,file=$("aph").files[0];
  if(!cur&&!file){st.textContent="Choose a photo for the new founder.";return}
  var photo=cur?cur.photo:null;
  if(file){try{photo=await toUri(file)}catch(e){st.textContent="That photo could not be read. Try a JPG or PNG.";return}}
  var o={id:cur?cur.id:"f"+Date.now(),n:n,co:co,c:cn,ind:ind,yr:parseInt($v("ayr"),10)||"",role:$v("arl")||"Founder",bio:$v("abio"),story:$v("asty")};
  if(cur&&cur.tile!=null&&!file){o.tile=cur.tile}
  o.photo=photo;
  if(cur){F[F.indexOf(cur)]=o}else{F.push(o)}
  clr();render();alist();persist("Publishing…")});
$("acx").addEventListener("click",clr);
$("acl").addEventListener("click",function(){$("adlg").close()});
(async function(){try{var u=await claude.use("user"),a=await claude.use("artifact");
  if(u&&a&&await u.canEdit()){AR=a;var b=$("adm");b.hidden=false;b.addEventListener("click",function(e){e.preventDefault();alist();$("adlg").showModal()})}}catch(e){}})();
render();
