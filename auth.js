/* ============================================================
   ADMIN LOGIN (Supabase Auth)
   The admin signs in with the email + password created in Supabase ->
   Authentication -> Users. Only emails listed in the `admins` table are let in,
   and the database enforces the same rule (row level security), so this
   cannot be bypassed from the browser.
   ============================================================ */
(function(){
  var $=function(i){return document.getElementById(i)};
  window.__authOk=true;if($("boot"))$("boot").hidden=true;
  var C=window.RF_SUPABASE||{};
  function show(id){["login"].forEach(function(x){$(x).hidden=x!==id})}
  function fail(t){show("login");$("lmsg").className="err";$("lmsg").textContent=t;$("lbtn").disabled=true}

  if(!C.url||!C.anonKey||/YOUR_/.test(C.url+C.anonKey)){fail("Supabase is not connected yet. Fill in config.js (see SETUP.md), then reload.");return}
  if(!window.supabase){fail("Could not load the Supabase library. Check your internet connection and reload.");return}

  var sb=window.RF_SB=supabase.createClient(C.url,C.anonKey,{auth:{persistSession:true,autoRefreshToken:true}});
  var started=false, IDLE_MS=30*60*1000, last=Date.now();

  function unlock(){
    if(started)return;started=true;
    $("login").hidden=true;$("app").hidden=false;$("logout").hidden=false;
    ["click","keydown"].forEach(function(ev){document.addEventListener(ev,function(){last=Date.now()})});
    setInterval(function(){if(Date.now()-last>IDLE_MS)logout()},15000);
    ["admin.js","admin-cms.js"].forEach(function(src){var s=document.createElement("script");s.src=src;document.body.appendChild(s)});
  }
  function logout(){sb.auth.signOut().then(function(){location.reload()})}
  $("logout").onclick=logout;

  /* confirm the signed-in user is an admin */
  function check(){
    return sb.rpc("is_admin").then(function(r){
      if(r.error||r.data!==true){
        return sb.auth.signOut().then(function(){show("login");$("lbtn").disabled=false;$("lmsg").className="err";$("lmsg").textContent="This account is not authorised for the admin panel.";return false});
      }
      unlock();return true;
    });
  }

  show("login");
  sb.auth.getSession().then(function(r){if(r.data&&r.data.session)check()});

  $("loginForm").onsubmit=function(e){
    e.preventDefault();
    var em=$("lemail").value.trim(),p=$("lpass").value,b=$("lbtn");
    if(!em||!p){$("lmsg").className="err";$("lmsg").textContent="Enter your email and password.";return}
    b.disabled=true;$("lmsg").className="";$("lmsg").textContent="Checking…";
    sb.auth.signInWithPassword({email:em,password:p}).then(function(r){
      if(r.error){$("lpass").value="";$("lmsg").className="err";$("lmsg").textContent="Incorrect email or password.";b.disabled=false;return}
      return check();
    }).catch(function(){$("lmsg").className="err";$("lmsg").textContent="Login failed. Please try again.";b.disabled=false});
  };
})();
