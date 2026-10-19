/* Admin: pop-up, newsletter, featured section, regions  (all stored in Supabase). */
(function(){
var sb=window.RF_SB,$=function(i){return document.getElementById(i)};
var BUCKET="featured",NIL="00000000-0000-0000-0000-000000000000";
var SIL="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#dfe3fa"/><circle cx="32" cy="26" r="11" fill="#8f9ad8"/><path d="M10 64c1-14 10-22 22-22s21 8 22 22z" fill="#8f9ad8"/></svg>');

function say(id,msg,cls){var e=$(id);e.textContent=msg;e.className=cls||""}
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function btn(text,cls,fn){var b=el("button",cls||"sec",text);b.type="button";b.onclick=fn;return b}
function when(t){try{return new Date(t).toLocaleString()}catch(e){return t}}
function uuid(){return crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(c){var r=Math.random()*16|0;return(c==="x"?r:(r&3|8)).toString(16)})}
function errMsg(e){var m=(e&&e.message)||String(e);return /row-level security|permission|JWT|401|403/i.test(m)?"Not allowed. Sign in again, and check that your email is in the admins table.":"Error: "+m}
function csv(rows,cols,name){
  var q=function(v){v=v==null?"":String(v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'}; /* also blocks spreadsheet formula injection */
  var t=[cols.map(q).join(",")].concat(rows.map(function(r){return cols.map(function(c){return q(r[c])}).join(",")})).join("\r\n");
  var a=el("a");a.href=URL.createObjectURL(new Blob(["﻿"+t],{type:"text/csv"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500);
}

/* ---------- tabs ---------- */
var loaded={};
var LOADERS={popup:function(){loadPopup();loadSubs()},news:loadNews,featured:loadFeatured,regions:loadRegions};
document.querySelectorAll("#tabs .tab").forEach(function(t){
  t.onclick=function(){
    var k=t.dataset.tab;
    document.querySelectorAll("#tabs .tab").forEach(function(x){x.classList.toggle("on",x===t)});
    document.querySelectorAll(".pane").forEach(function(p){p.hidden=p.id!=="pane-"+k});
    if(LOADERS[k]&&!loaded[k]){loaded[k]=true;LOADERS[k]()}
  };
});

/* ---------- generic: save a list without ever losing rows ----------
   1) upsert every current row, 2) only then delete rows that were removed. */
function saveList(table,rows,keepIds){
  var step=rows.length?sb.from(table).upsert(rows):Promise.resolve({});
  return step.then(function(r){
    if(r.error)throw r.error;
    var q=sb.from(table).delete();
    q=keepIds.length?q.not("id","in","("+keepIds.join(",")+")"):q.neq("id",NIL);
    return q;
  }).then(function(r){if(r.error)throw r.error});
}

/* ============================ POP-UP ============================ */
var PP=["brand","title","subtitle","name_label","email_label","message_label","button_text","success_text","footer_text","delay_seconds","repeat_days"];
function loadPopup(){
  sb.from("popup_settings").select("*").eq("id",1).maybeSingle().then(function(r){
    if(r.error){say("pp_status",errMsg(r.error),"err");return}
    var s=r.data||{};$("pp_enabled").checked=s.enabled!==false;
    PP.forEach(function(k){$("pp_"+k).value=s[k]==null?"":s[k]});
  });
}
$("pp_save").onclick=function(){
  var o={id:1,enabled:$("pp_enabled").checked,updated_at:new Date().toISOString()};
  PP.forEach(function(k){o[k]=$("pp_"+k).value.trim()});
  if(!o.title||!o.button_text){say("pp_status","Heading and button text are required.","err");return}
  o.delay_seconds=Math.min(600,Math.max(0,parseInt(o.delay_seconds,10)||0));
  o.repeat_days=Math.min(365,Math.max(0,parseInt(o.repeat_days,10)||0));
  $("pp_delay_seconds").value=o.delay_seconds;$("pp_repeat_days").value=o.repeat_days;
  var b=$("pp_save");b.disabled=true;say("pp_status","Saving…");
  sb.from("popup_settings").upsert(o).then(function(r){
    if(r.error)throw r.error;say("pp_status","Saved. The pop-up is updated on the live site.","ok");
  }).catch(function(e){say("pp_status",errMsg(e),"err")}).then(function(){b.disabled=false});
};

var SUBS=[];
function loadSubs(){
  sb.from("popup_submissions").select("*").order("created_at",{ascending:false}).limit(1000).then(function(r){
    if(r.error){say("sub_status",errMsg(r.error),"err");return}
    SUBS=r.data||[];renderSubs();
  });
}
function renderSubs(){
  var box=$("sub_list");box.innerHTML="";$("sub_count").textContent=SUBS.length;
  if(!SUBS.length){box.appendChild(el("p","empty","No messages yet."));return}
  SUBS.forEach(function(s){
    var d=el("div","record"),m=el("div","meta");
    m.appendChild(el("b",null,s.name));
    var a=el("a",null,s.email);a.href="mailto:"+encodeURIComponent(s.email);m.appendChild(a);
    m.appendChild(el("span","when",when(s.created_at)));d.appendChild(m);
    if(s.message)d.appendChild(el("p",null,s.message));
    var act=el("div","act"),del=btn("Delete","del",function(){
      if(del.textContent!=="Confirm delete"){del.textContent="Confirm delete";return}
      sb.from("popup_submissions").delete().eq("id",s.id).then(function(r){
        if(r.error){say("sub_status",errMsg(r.error),"err");return}
        SUBS=SUBS.filter(function(x){return x.id!==s.id});renderSubs();
      });
    });act.appendChild(del);d.appendChild(act);box.appendChild(d);
  });
}
$("sub_refresh").onclick=loadSubs;
$("sub_csv").onclick=function(){csv(SUBS,["created_at","name","email","message"],"popup-messages.csv")};

/* ============================ NEWSLETTER ============================ */
var NL=[];
function loadNews(){
  sb.from("newsletter_subscribers").select("*").order("created_at",{ascending:false}).limit(5000).then(function(r){
    if(r.error){say("nl_status",errMsg(r.error),"err");return}
    NL=r.data||[];renderNews();
  });
}
function renderNews(){
  var q=$("nl_q").value.trim().toLowerCase(),box=$("nl_list");box.innerHTML="";$("nl_count").textContent=NL.length;
  var list=NL.filter(function(s){return !q||s.email.toLowerCase().indexOf(q)>-1});
  if(!list.length){box.appendChild(el("p","empty",NL.length?"No match.":"No subscribers yet."));return}
  list.slice(0,500).forEach(function(s){
    var d=el("div","item");d.appendChild(el("span",null,s.email));d.appendChild(el("span","when",when(s.created_at)));
    var del=btn("Delete","del",function(){
      if(del.textContent!=="Confirm delete"){del.textContent="Confirm delete";return}
      sb.from("newsletter_subscribers").delete().eq("id",s.id).then(function(r){
        if(r.error){say("nl_status",errMsg(r.error),"err");return}
        NL=NL.filter(function(x){return x.id!==s.id});renderNews();
      });
    });d.appendChild(del);box.appendChild(d);
  });
  if(list.length>500)box.appendChild(el("p","empty","Showing the first 500. Use search, or download the CSV for everyone."));
}
$("nl_q").oninput=renderNews;$("nl_refresh").onclick=loadNews;
$("nl_csv").onclick=function(){csv(NL,["created_at","email"],"newsletter-subscribers.csv")};
$("nl_copy").onclick=function(){
  var t=NL.map(function(s){return s.email}).join(", ");
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){say("nl_status","Copied "+NL.length+" emails.","ok")}).catch(function(){say("nl_status","Copy failed. Use Download CSV instead.","err")});
};

/* ============================ FEATURED ============================ */
var TOP=[],MORE=[],oldFiles=[];
/* row: {id,name,company,revenue,link,photo_url, file:Blob|null, preview:url|null} */
function squarePhoto(file){
  return new Promise(function(res,rej){
    var r=new FileReader();r.onerror=rej;
    r.onload=function(){var im=new Image();im.onerror=rej;im.onload=function(){
      var S=400,m=Math.min(im.width,im.height),c=el("canvas");c.width=c.height=S;
      c.getContext("2d").drawImage(im,(im.width-m)/2,Math.max(0,(im.height-m)/4),m,m,0,0,S,S); /* crop square, favour the top (faces) */
      c.toBlob(function(b){b?res(b):rej()},"image/jpeg",.85)};im.src=r.result};
    r.readAsDataURL(file);
  });
}
function setPhoto(row,file,after){
  squarePhoto(file).then(function(b){row.file=b;if(row.preview)URL.revokeObjectURL(row.preview);row.preview=URL.createObjectURL(b);after()})
    .catch(function(){say("ft_status","That photo could not be read. Try a JPG or PNG.","err")});
}
function loadFeatured(){
  Promise.all([sb.from("featured_settings").select("*").eq("id",1).maybeSingle(),
    sb.from("featured_founders").select("*").order("sort_order").order("created_at")]).then(function(a){
    if(a[0].error||a[1].error){say("ft_status",errMsg(a[0].error||a[1].error),"err");return}
    var s=a[0].data||{};$("ft_headline").value=s.headline||"";$("ft_total").value=s.total||0;
    var rows=a[1].data||[];
    TOP=rows.filter(function(r){return r.kind==="top"}).map(function(r){return{id:r.id,name:r.name,company:r.company,revenue:r.revenue,link:r.link,photo_url:r.photo_url}});
    MORE=rows.filter(function(r){return r.kind==="more"}).map(function(r){return{id:r.id,photo_url:r.photo_url}});
    renderFeatured();
  });
}
function mv(arr,i,d,fn){var j=i+d;if(j<0||j>=arr.length)return;var t=arr[i];arr[i]=arr[j];arr[j]=t;fn()}
function renderFeatured(){
  var box=$("ft_top");box.innerHTML="";$("ft_topcount").textContent=TOP.length;$("ft_morecount").textContent=MORE.length;
  if(!TOP.length)box.appendChild(el("p","empty","No founders yet. The website shows grey placeholders until you add some."));
  TOP.forEach(function(r,i){
    var d=el("div","erow"),img=el("img","av");img.alt="";img.src=r.preview||r.photo_url||SIL;d.appendChild(img);
    var f=el("div","fields");
    [["name","Founder name"],["company","Company"],["revenue","Revenue e.g. $12M/yr"],["link","Link https://…"]].forEach(function(k){
      var inp=el("input");inp.placeholder=k[1];inp.setAttribute("aria-label",k[1]);inp.value=r[k[0]]||"";inp.maxLength=200;inp.oninput=function(){r[k[0]]=inp.value};f.appendChild(inp);
    });d.appendChild(f);
    var b=el("div","btns"),fl=el("label","filebtn sm","Photo"),fi=el("input");fi.type="file";fi.accept="image/*";fi.hidden=true;
    fi.onchange=function(){if(fi.files[0])setPhoto(r,fi.files[0],function(){img.src=r.preview})};fl.appendChild(fi);b.appendChild(fl);
    b.appendChild(btn("↑","sec",function(){mv(TOP,i,-1,renderFeatured)}));b.appendChild(btn("↓","sec",function(){mv(TOP,i,1,renderFeatured)}));
    b.appendChild(btn("Remove","del",function(){if(r.photo_url)oldFiles.push(r.photo_url);TOP.splice(i,1);renderFeatured()}));
    d.appendChild(b);box.appendChild(d);
  });
  var m=$("ft_more");m.innerHTML="";
  if(!MORE.length)m.appendChild(el("p","empty","No small circles yet."));
  MORE.forEach(function(r,i){
    var t=el("div","thumb"),img=el("img","av");img.alt="";img.src=r.preview||r.photo_url||SIL;t.appendChild(img);
    var x=btn("×","del",function(){if(r.photo_url)oldFiles.push(r.photo_url);MORE.splice(i,1);renderFeatured()});x.setAttribute("aria-label","Remove photo");t.appendChild(x);m.appendChild(t);
  });
}
$("ft_addtop").onclick=function(){TOP.push({id:uuid(),name:"",company:"",revenue:"",link:"",photo_url:"",isNew:true});renderFeatured()};
$("ft_addmore").onchange=function(){
  Array.prototype.forEach.call(this.files,function(file){var r={id:uuid(),photo_url:"",isNew:true};MORE.push(r);setPhoto(r,file,renderFeatured)});
  this.value="";renderFeatured();
};
function pathOf(url){var k="/object/public/"+BUCKET+"/",i=(url||"").indexOf(k);return i<0?null:decodeURIComponent(url.slice(i+k.length).split("?")[0])}
function upload(row){
  if(!row.file)return Promise.resolve();
  var path=row.id+"-"+Date.now()+".jpg";
  return sb.storage.from(BUCKET).upload(path,row.file,{contentType:"image/jpeg",cacheControl:"31536000"}).then(function(r){
    if(r.error)throw r.error;
    var old=row.photo_url;row.photo_url=sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;row.file=null;
    if(old)oldFiles.push(old);
  });
}
$("ft_save").onclick=function(){
  var bad=TOP.filter(function(r){return r.link&&!/^https?:\/\//i.test(r.link.trim())});
  if(bad.length){say("ft_status","Links must start with http:// or https://","err");return}
  var b=$("ft_save");b.disabled=true;say("ft_status","Saving…");
  var all=TOP.concat(MORE);
  Promise.all(all.map(upload)).then(function(){
    var s={id:1,headline:$("ft_headline").value.trim(),total:Math.max(0,parseInt($("ft_total").value,10)||0)};
    return sb.from("featured_settings").upsert(s).then(function(r){if(r.error)throw r.error});
  }).then(function(){
    var rows=[];
    TOP.forEach(function(r,i){rows.push({id:r.id,kind:"top",name:(r.name||"").trim(),company:(r.company||"").trim(),revenue:(r.revenue||"").trim(),link:(r.link||"").trim(),photo_url:r.photo_url||"",sort_order:i})});
    MORE.forEach(function(r,i){rows.push({id:r.id,kind:"more",name:"",company:"",revenue:"",link:"",photo_url:r.photo_url||"",sort_order:1000+i})});
    return saveList("featured_founders",rows,rows.map(function(r){return"\""+r.id+"\""}));
  }).then(function(){
    var keep={};TOP.concat(MORE).forEach(function(r){if(r.photo_url)keep[r.photo_url]=1});
    var gone=oldFiles.filter(function(u){return !keep[u]}).map(pathOf).filter(Boolean);oldFiles=[];
    if(gone.length)sb.storage.from(BUCKET).remove(gone); /* best effort clean-up */
    say("ft_status","Saved. The website is updated.","ok");renderFeatured();
  }).catch(function(e){say("ft_status",errMsg(e),"err")}).then(function(){b.disabled=false});
};

/* ============================ REGIONS ============================ */
var RG=[];
function loadRegions(){
  sb.from("regions").select("*").order("sort_order").then(function(r){
    if(r.error){say("rg_status",errMsg(r.error),"err");return}
    RG=(r.data||[]).map(function(x){return{id:x.id,name:x.name,count:x.founder_count}});renderRegions();
  });
}
function renderRegions(){
  var box=$("rg_list");box.innerHTML="";
  if(!RG.length)box.appendChild(el("p","empty","No regions. The website keeps its built-in list until you save at least one."));
  RG.forEach(function(r,i){
    var d=el("div","erow reg"),n=el("input"),c=el("input");
    n.value=r.name;n.placeholder="Region name";n.maxLength=80;n.setAttribute("aria-label","Region name");n.oninput=function(){r.name=n.value};
    c.type="number";c.min=0;c.value=r.count;c.setAttribute("aria-label","Founder count");c.oninput=function(){r.count=c.value};
    d.appendChild(n);d.appendChild(c);
    var b=el("div","btns");b.appendChild(btn("↑","sec",function(){mv(RG,i,-1,renderRegions)}));b.appendChild(btn("↓","sec",function(){mv(RG,i,1,renderRegions)}));
    b.appendChild(btn("Remove","del",function(){RG.splice(i,1);renderRegions()}));d.appendChild(b);box.appendChild(d);
  });
}
$("rg_add").onclick=function(){RG.push({id:uuid(),name:"",count:0});renderRegions()};
$("rg_save").onclick=function(){
  if(RG.some(function(r){return !r.name.trim()})){say("rg_status","Every region needs a name.","err");return}
  var b=$("rg_save");b.disabled=true;say("rg_status","Saving…");
  var rows=RG.map(function(r,i){return{id:r.id,name:r.name.trim(),founder_count:Math.max(0,parseInt(r.count,10)||0),sort_order:i}});
  saveList("regions",rows,rows.map(function(r){return"\""+r.id+"\""})).then(function(){
    say("rg_status","Saved. The website is updated.","ok");loadRegions();
  }).catch(function(e){say("rg_status",errMsg(e),"err")}).then(function(){b.disabled=false});
};
})();
