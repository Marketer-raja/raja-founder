var T=document.querySelectorAll("#founders .tile img");
var F=JSON.parse(document.getElementById("fdata").textContent);
F.forEach(function(f){if(f.tile!=null&&!f.photo)f.photo=T[f.tile].src});
var $=function(i){return document.getElementById(i)};
function opts(sel,key){while(sel.options.length>1)sel.remove(1);F.map(function(f){return f[key]}).filter(function(v,i,a){return a.indexOf(v)===i}).sort().forEach(function(v){var o=document.createElement("option");o.value=v;o.textContent=v;sel.appendChild(o)})}
function fill(){opts($("fc"),"c");opts($("fi"),"ind")}fill();
var HISTORY={"Bhavin Turakhia":"bhavin-turakhia.html","Ashish Hemrajani":"ashish-hemrajani.html","Naveen Tewari":"naveen-tewari.html","Mayank Kumar":"mayank-kumar.html","Varun Khaitan":"varun-khaitan.html","Ritesh Agarwal":"ritesh-agarwal.html","Sachin Bansal":"sachin-bansal.html","Binny Bansal":"binny-bansal.html","Ghazal Alagh":"ghazal-alagh.html","Frederic Lalonde":"frederic-lalonde.html","Alex Bouaziz":"alex-bouaziz.html","Amy Porterfield":"amy-porterfield.html","Ana Vershinina":"ana-vershinina.html","Brian Chesky":"brian-chesky.html","Chris Meade":"chris-meade.html","Shradha Sharma":"shradha-sharma.html","Bhavish Aggarwal":"bhavish-aggarwal.html","Vijay Shekhar Sharma":"vijay-shekhar-sharma.html","Deepinder Goyal":"deepinder-goyal.html","Pankaj Chaddah":"pankaj-chaddah.html"};
var PAGE=10,shown=PAGE;
function render(reset){
  if(reset!==false)shown=PAGE;
  var q=$("q").value.trim().toLowerCase(),c=$("fc").value,n=$("fi").value,box=$("cards");
  var list=F.map(function(f,i){return i}).filter(function(i){var f=F[i];
    return (!c||f.c===c)&&(!n||f.ind===n)&&(!q||(f.n+" "+f.co+" "+f.c+" "+f.ind).toLowerCase().indexOf(q)>-1)});
  box.innerHTML="";
  list.slice(0,shown).forEach(function(i){var f=F[i],b=document.createElement("button");b.className="card";b.type="button";
    b.innerHTML='<img alt=""><div class="ci"><b></b><span></span><span></span></div>';
    b.querySelector("img").src=f.photo;b.querySelector("b").textContent=f.n;
    var sp=b.querySelectorAll("span");sp[0].textContent=f.co;sp[1].textContent=f.c+" · "+f.ind;
    b.addEventListener("click",function(){openP(i)});box.appendChild(b)});
  if(!list.length){var e=document.createElement("div");e.className="empty";e.textContent="No founders match your search. Clear the filters or try a different name.";box.appendChild(e)}
  var mw=$("more-wrap");mw.innerHTML="";
  if(list.length>shown){var mb=document.createElement("button");mb.type="button";mb.className="more-btn";
    mb.innerHTML='Read more <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    mb.addEventListener("click",function(){shown+=PAGE;render(false)});mw.appendChild(mb);mw.hidden=false}else mw.hidden=true;
  $("cnt").textContent=Math.min(shown,list.length)+" of "+list.length+" founders shown";
}
function openP(i){var f=F[i];(window.dataLayer=window.dataLayer||[]).push({event:"founder_view",founder_name:f.n,founder_country:f.c,founder_industry:f.ind});$("pi").src=f.photo;$("pi").alt=f.n;$("pn").textContent=f.n;$("pr").textContent=f.role+", "+f.co;
  $("pd").innerHTML="";[["Country",f.c],["Industry",f.ind],["Founded",f.yr]].forEach(function(r){var a=document.createElement("dt"),b=document.createElement("dd");a.textContent=r[0];b.textContent=r[1];$("pd").appendChild(a);$("pd").appendChild(b)});
  $("pb").textContent=f.bio;$("ps").textContent=f.story;
  [["pw",f.web],["pl",f.li]].forEach(function(x){var a=$(x[0]);if(x[1]){a.href=x[1];a.target="_blank";a.rel="noopener";a.style.display=""}else{a.style.display="none"}});var hp=$("ph"),hu=f.history||HISTORY[f.n];if(hp){if(hu){hp.href=hu;hp.style.display=""}else{hp.style.display="none"}}
  $("dlg").showModal()}
$("q").addEventListener("input",render);
var _st;$("q").addEventListener("input",function(){clearTimeout(_st);var v=this.value.trim();if(v.length>1)_st=setTimeout(function(){(window.dataLayer=window.dataLayer||[]).push({event:"founder_search",search_term:v})},800)});
$("fc").addEventListener("change",function(){(window.dataLayer=window.dataLayer||[]).push({event:"filter_country",filter_value:this.value||"all"})});
$("fi").addEventListener("change",function(){(window.dataLayer=window.dataLayer||[]).push({event:"filter_industry",filter_value:this.value||"all"})});$("fc").addEventListener("change",render);$("fi").addEventListener("change",render);
$("cl").addEventListener("click",function(){$("dlg").close()});
$("dlg").addEventListener("click",function(e){if(e.target===$("dlg"))$("dlg").close()});
var TID=["s1","s2","s4","s3"];
function openT(k){var i=F.findIndex(function(f){return f.id===TID[k]});if(i>-1)openP(i)}
document.querySelectorAll("#founders .tile").forEach(function(t,k){t.tabIndex=0;t.setAttribute("role","button");t.setAttribute("aria-label","Open founder profile");
  t.addEventListener("click",function(){openT(k)});t.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();openT(k)}})});
render();
fetch("founders.json?v="+Date.now()).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){if(Array.isArray(j)){F=j;fill();render()}}).catch(function(){});
