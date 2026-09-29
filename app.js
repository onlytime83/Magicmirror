const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const screens={welcome:$("#welcome"),mirror:$("#mirror"),examples:$("#examples"),settings:$("#settings"),conversation:$("#conversation")};
let stream=null, recognition=null, isRecording=false, persona="moon";
let settings={beauty:true,tts:true};
const conversation=[];

const answers={
beauty:["当然漂亮呀。让我认真看看……嗯，答案已经很明显了。今天的你，很漂亮，而且眼睛里有一种特别的光。","漂亮当然不只是五官。今天的你有自己的光彩，不需要和任何人比较。"],
who:["当然是你呀。这个问题，魔镜已经回答过很多次了——答案从来没有改变。你就是今天最闪耀的人。","让我看看魔镜的答案……是你。别忘了，你的独特，本来就无人可以替代。"],
me:["你当然美。更重要的是，你认真生活、努力向前的样子，本身就是一种很美的力量。"],
bad:["没关系呀。你不需要每天都完美。今天已经很辛苦了，依然值得被温柔对待。慢一点，也没关系。你正在变得越来越好。"],
luck:["今天的运气可能还没有出现，但这并不意味着好事情不会来。先给自己一个微笑吧，新的可能正在路上。"],
success:["我看见的是一个愿意向前走的人。成功不是一句预言，而是你一次又一次选择坚持之后发生的事。我相信你有这个能力。"],
stupid:["才不是。一次没做好，不代表你不聪明。允许自己犯错，也允许自己慢慢学会。你远比一次结果更有价值。"],
encourage:["今天送你一句魔镜祝福：你不需要成为别人眼中的最好，只需要成为越来越喜欢自己的那个人。"]
};

const personaIntro={
moon:"月光会替你守护今天的心情。",
queen:"女王魔镜只提醒你一件事：不要低估自己。",
flower:"像花一样，慢慢盛开，也是一种力量。",
fate:"命运正在悄悄为你打开新的可能。",
sun:"把今天的阳光留在心里，向前走吧。"
};

function show(name){
  Object.values(screens).forEach(x=>x.classList.remove("active"));
  screens[name].classList.add("active");
}
function toast(t){const x=$("#toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),1800)}

function decorateMirror(){
  const garland=$(".flower-garland");
  for(let index=0;index<24;index++){
    const angle=(Math.PI*2*index/24)-Math.PI/2;
    const flower=document.createElement("span");
    flower.className="flower";
    flower.style.left=`${50+50*Math.cos(angle)}%`;
    flower.style.top=`${50+50*Math.sin(angle)}%`;
    flower.style.setProperty("--turn",`${index*17}deg`);
    garland.append(flower);
  }
}

async function openCamera(){
  const camera=$("#camera"), fallback=$("#cameraFallback");
  if(!window.isSecureContext){fallback.textContent="摄像头需要安全连接，请使用 HTTPS 地址访问";return}
  if(!navigator.mediaDevices?.getUserMedia){fallback.textContent="当前浏览器不支持摄像头，请使用最新版 Safari 或 Chrome";return}
  stream?.getTracks().forEach(track=>track.stop());
  fallback.textContent="正在请求前置摄像头权限…";
  fallback.classList.remove("hidden");
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"user"},width:{ideal:1080},height:{ideal:1440}},audio:false});
    camera.srcObject=stream;
    camera.playsInline=true;
    await camera.play();
    fallback.classList.add("hidden");
  }catch(e){
    stream?.getTracks().forEach(track=>track.stop());
    stream=null;
    camera.srcObject=null;
    const messages={NotAllowedError:"摄像头权限被拒绝，请在浏览器网站设置中允许访问",NotFoundError:"没有找到可用的前置摄像头",NotReadableError:"摄像头正被其他应用占用，请关闭后重试",OverconstrainedError:"当前摄像头不支持所需画面，请重试"};
    fallback.textContent=messages[e.name]||"无法启动摄像头，请检查浏览器权限后重试";
    toast(fallback.textContent);
  }
}

function addChatMessage(role,text){
  const message=document.createElement("div");
  message.className=`chat-message ${role}`;
  message.textContent=text;
  $("#chatMessages").append(message);
  $("#chatMessages").scrollTop=$("#chatMessages").scrollHeight;
}

async function sendChatMessage(event){
  event.preventDefault();
  const input=$("#chatInput"), text=input.value.trim();
  if(!text)return;
  input.value="";
  conversation.push({role:"user",content:text});
  addChatMessage("user",text);
  const send=$("#chatSend");
  send.disabled=true;
  const pending=document.createElement("div");
  pending.className="chat-message assistant pending";
  pending.textContent="魔镜正在想…";
  $("#chatMessages").append(pending);
  $("#chatMessages").scrollTop=$("#chatMessages").scrollHeight;
  try{
    const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:conversation,persona})});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"暂时无法连接魔镜，请稍后再试");
    conversation.push({role:"assistant",content:result.reply});
    pending.textContent=result.reply;
    pending.classList.remove("pending");
    speak(result.reply);
  }catch(error){
    pending.textContent=error.message.includes("Failed to fetch")?"连接不到对话服务。请确认已按 README 启动服务端，并通过 HTTPS 部署后在手机使用。":error.message;
    pending.classList.add("chat-error");
  }finally{
    send.disabled=false;
    input.focus();
  }
}

function speak(text){
  if(!settings.tts || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="zh-CN";u.rate=.88;u.pitch=1.08;u.volume=1;
  const voices=speechSynthesis.getVoices();
  const zh=voices.find(v=>/zh|Chinese|中文/i.test(v.lang+" "+v.name));
  if(zh)u.voice=zh;
  speechSynthesis.speak(u);
}

function makeAnswer(q){
  q=q.toLowerCase().replace(/[，。！？、,.!?]/g,"");
  if(/谁.*(漂亮|美)|最漂亮/.test(q))return answers.who[Math.floor(Math.random()*answers.who.length)];
  if(/漂亮|好看/.test(q))return answers.beauty[Math.floor(Math.random()*answers.beauty.length)];
  if(/美吗|美不美|美$/.test(q))return answers.me[Math.floor(Math.random()*answers.me.length)];
  if(/状态不好|累|疲惫|难过|不开心|不好/.test(q))return answers.bad[Math.floor(Math.random()*answers.bad.length)];
  if(/倒霉|运气/.test(q))return answers.luck[Math.floor(Math.random()*answers.luck.length)];
  if(/成功|能不能成功|做得到/.test(q))return answers.success[Math.floor(Math.random()*answers.success.length)];
  if(/笨|没用|不行|失败/.test(q))return answers.stupid[Math.floor(Math.random()*answers.stupid.length)];
  if(/鼓励|加油|一句话/.test(q))return answers.encourage[Math.floor(Math.random()*answers.encourage.length)];
  return `${personaIntro[persona]} 无论你刚才问的是什么，我都想先告诉你：你值得被肯定，也值得拥有美好的一天。`;
}

function answer(q){
  const text=makeAnswer(q);
  $("#status").textContent="魔镜正在回答你……";
  $("#answerText").textContent=text;
  $("#answerBox").classList.remove("hidden");
  setTimeout(()=>{ $("#status").textContent="魔镜说："; speak(text); },450);
}

function setupRecognition(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){return null}
  const r=new SR(); r.lang="zh-CN";r.interimResults=false;r.continuous=false;
  r.onstart=()=>{isRecording=true;$("#micBtn").classList.add("recording");$("#micHint").textContent="正在听…";$("#status").textContent="我在听，请说话…"};
  r.onresult=e=>{const q=e.results[0][0].transcript;$("#micHint").textContent=q;answer(q)};
  r.onerror=e=>{if(e.error!=="aborted")toast("没有听清，再试一次");$("#micHint").textContent="按住说话"};
  r.onend=()=>{isRecording=false;$("#micBtn").classList.remove("recording");if($("#micHint").textContent==="正在听…" )$("#micHint").textContent="按住说话"};
  return r;
}

function startRecord(e){
  e.preventDefault();
  if(!recognition){toast("此浏览器暂不支持语音识别，可使用下方示例问题");return}
  if(isRecording)return;
  try{recognition.start()}catch{}
}
function stopRecord(e){e.preventDefault();if(isRecording)try{recognition.stop()}catch{}}

$("#openMirror").onclick=async()=>{show("mirror");await openCamera();recognition=setupRecognition()};
$("#examplesBtn").onclick=()=>show("examples");
$("#chatBtn").onclick=()=>{show("conversation");if(!$("#chatMessages").childElementCount)addChatMessage("assistant","你好呀，今天有什么想和我聊聊的？");$("#chatInput").focus()};
$("#closeChat").onclick=()=>show("mirror");
$("#chatForm").addEventListener("submit",sendChatMessage);
$("#closeExamples").onclick=()=>show("mirror");
$("#settingsBtn").onclick=()=>show("settings");
$("#closeSettings").onclick=()=>show("mirror");
$("#speakAgain").onclick=()=>speak($("#answerText").textContent);
$("#micBtn").addEventListener("pointerdown",startRecord);
$("#micBtn").addEventListener("pointerup",stopRecord);
$("#micBtn").addEventListener("pointercancel",stopRecord);
$("#micBtn").addEventListener("pointerleave",e=>{if(isRecording)stopRecord(e)});

$$(".question-list button").forEach(b=>b.onclick=()=>{show("mirror");answer(b.dataset.q)});
$$(".personas button").forEach(b=>b.onclick=()=>{$$(".personas button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");persona=b.dataset.persona;localStorage.setItem("persona",persona);toast("魔镜人格已切换")});
$("#beautyToggle").onchange=e=>{settings.beauty=e.target.checked;$(".beauty-overlay").style.opacity=e.target.checked?"1":"0";$("#camera").style.filter=e.target.checked?"brightness(1.06) saturate(1.06) contrast(.96) blur(.15px)":"none"};
$("#ttsToggle").onchange=e=>settings.tts=e.target.checked;
persona=localStorage.getItem("persona")||"moon";
$$(".personas button").find(b=>b.dataset.persona===persona)?.classList.add("selected");
decorateMirror();

// 星空粒子
const c=$("#stars"),ctx=c.getContext("2d");let dots=[];
function resize(){c.width=innerWidth*devicePixelRatio;c.height=innerHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);dots=Array.from({length:90},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.5+.3,a:Math.random(),s:Math.random()*.012+.003}))}
function stars(){ctx.clearRect(0,0,innerWidth,innerHeight);for(const d of dots){d.a+=d.s;if(d.a>1||d.a<.15)d.s*=-1;ctx.globalAlpha=d.a;ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fill()}requestAnimationFrame(stars)}
addEventListener("resize",resize);resize();stars();
window.addEventListener("beforeunload",()=>stream?.getTracks().forEach(t=>t.stop()));
