
(() => {
"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const errorBox = document.getElementById("error");

const TYPES = ["red","blue","green","yellow","purple","orange"];
const COLORS = {
  red:["#ff6670","#b92138"], blue:["#69eaff","#1779d8"],
  green:["#8cf05e","#26963d"], yellow:["#fff06a","#e19b18"],
  purple:["#dc88ff","#6c2db0"], orange:["#ffd45c","#e56b14"]
};
const N=8;
let W=innerWidth,H=innerHeight,DPR=Math.min(devicePixelRatio||1,2);
let cell=64,bx=0,by=0,boardPx=512;
let board=[],selected=null,busy=false,moves=25,progress=0,goal=12;
let tileImages={}, pirateImg=null, bgImg=null;
let message="", messageUntil=0;

function fit(){
  W=innerWidth; H=innerHeight; DPR=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.floor(W*DPR); canvas.height=Math.floor(H*DPR);
  canvas.style.width=W+"px"; canvas.style.height=H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const mobile=W<760;
  boardPx=Math.min(mobile?W-28:Math.min(620,W*0.42), H-(mobile?250:135));
  boardPx=Math.max(320,boardPx);
  cell=boardPx/N;
  bx=mobile?(W-boardPx)/2:Math.min(W-boardPx-40,W*0.58);
  by=mobile?Math.max(205,(H-boardPx)/2+10):Math.max(105,(H-boardPx)/2+5);
}
addEventListener("resize",fit);

function loadImage(path,cb){
  const im=new Image();
  im.onload=()=>cb(im,true);
  im.onerror=()=>cb(null,false);
  im.src=path;
}
TYPES.forEach(t=>loadImage(`assets/tiles/tile_${t}.png`,im=>tileImages[t]=im));
loadImage("assets/characters/pirate_01/worried.png",im=>pirateImg=im);
loadImage("assets/backgrounds/pirate/main.webp",im=>bgImg=im);

function randType(){return TYPES[(Math.random()*TYPES.length)|0];}
function badAt(x,y){
  const t=board[y][x];
  return (x>=2&&board[y][x-1]===t&&board[y][x-2]===t) ||
         (y>=2&&board[y-1][x]===t&&board[y-2][x]===t);
}
function newBoard(){
  board=Array.from({length:N},()=>Array(N));
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    do board[y][x]=randType(); while(badAt(x,y));
  }
}
function matches(){
  const s=new Set();
  for(let y=0;y<N;y++){
    let run=1;
    for(let x=1;x<=N;x++){
      if(x<N && board[y][x]===board[y][x-1]) run++;
      else { if(run>=3) for(let k=x-run;k<x;k++) s.add(k+","+y); run=1; }
    }
  }
  for(let x=0;x<N;x++){
    let run=1;
    for(let y=1;y<=N;y++){
      if(y<N && board[y][x]===board[y-1][x]) run++;
      else { if(run>=3) for(let k=y-run;k<y;k++) s.add(x+","+k); run=1; }
    }
  }
  return [...s].map(v=>v.split(",").map(Number));
}
function swap(a,b){
  const t=board[a.y][a.x]; board[a.y][a.x]=board[b.y][b.x]; board[b.y][b.x]=t;
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

async function resolve(){
  busy=true;
  let m=matches();
  if(!m.length){busy=false;return;}
  while(m.length){
    progress+=m.length;
    message=`+${m.length}  COMBO!`;
    messageUntil=performance.now()+700;
    for(const [x,y] of m) board[y][x]=null;
    draw(); await sleep(150);
    for(let x=0;x<N;x++){
      let w=N-1;
      for(let y=N-1;y>=0;y--) if(board[y][x]!==null){board[w][x]=board[y][x];if(w!==y)board[y][x]=null;w--;}
      for(let y=w;y>=0;y--) board[y][x]=randType();
    }
    draw(); await sleep(170);
    m=matches();
  }
  busy=false;
  updateEnd();
}

async function attempt(a,b){
  busy=true; swap(a,b); draw(); await sleep(120);
  if(!matches().length){
    swap(a,b); draw(); await sleep(120); busy=false; return;
  }
  moves--; await resolve();
}

function updateEnd(){
  if(progress>=goal || moves<=0){
    busy=true;
    message=progress>=goal ? "✨ ПИРАТКА СПАСЕНА! ✨" : "ХОДЫ ЗАКОНЧИЛИСЬ";
    messageUntil=performance.now()+9999999;
  }
}

function boardCell(px,py){
  const x=Math.floor((px-bx)/cell), y=Math.floor((py-by)/cell);
  if(x<0||x>=N||y<0||y>=N)return null;
  return {x,y};
}

function pointer(e){
  if(busy)return;
  const r=canvas.getBoundingClientRect();
  const px=(e.clientX-r.left),py=(e.clientY-r.top);
  const c=boardCell(px,py); if(!c)return;
  if(!selected){selected=c;draw();return;}
  const a=selected; selected=null;
  if(Math.abs(a.x-c.x)+Math.abs(a.y-c.y)!==1){draw();return;}
  attempt(a,c);
}
canvas.addEventListener("pointerdown",pointer);

function roundedRect(x,y,w,h,r,fill,stroke){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
  if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function drawTile(t,x,y,selectedTile){
  const pad=5,px=bx+x*cell+pad,py=by+y*cell+pad,s=cell-pad*2;
  if(tileImages[t]){
    ctx.save();
    if(selectedTile){ctx.shadowColor="#fff";ctx.shadowBlur=18;}
    ctx.drawImage(tileImages[t],px,py,s,s);
    ctx.restore();
    return;
  }
  const c=COLORS[t],g=ctx.createLinearGradient(px,py,px,py+s);
  g.addColorStop(0,c[0]);g.addColorStop(1,c[1]);
  ctx.fillStyle=g;roundedRect(px,py,s,s,18,g);
  ctx.fillStyle="rgba(255,255,255,.35)";ctx.beginPath();ctx.ellipse(px+s*.35,py+s*.27,s*.18,s*.08,-.4,0,Math.PI*2);ctx.fill();
  if(selectedTile){ctx.strokeStyle="#fff";ctx.lineWidth=4;roundedRect(px-2,py-2,s+4,s+4,20,null,"#fff");}
}

function drawCharacter(){
  const mobile=W<760;
  const areaX=mobile?18:20, areaW=mobile?W-36:Math.max(300,bx-50);
  const areaY=mobile?78:90, areaH=mobile?110:Math.min(H-170,boardPx+50);
  roundedRect(areaX,areaY,areaW,areaH,24,"rgba(4,25,39,.78)","rgba(50,216,235,.20)");
  if(pirateImg){
    const maxW=mobile?125:Math.min(250,areaW*.62), maxH=areaH-12;
    const ratio=Math.min(maxW/pirateImg.width,maxH/pirateImg.height);
    const iw=pirateImg.width*ratio,ih=pirateImg.height*ratio;
    ctx.drawImage(pirateImg,areaX+areaW/2-iw/2,areaY+areaH-ih-5,iw,ih);
  }else{
    ctx.fillStyle="#d89062";ctx.beginPath();ctx.arc(areaX+areaW/2,areaY+55,27,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#a94325";ctx.beginPath();ctx.arc(areaX+areaW/2,areaY+42,32,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle="#8b3d2a";roundedRect(areaX+areaW/2-45,areaY+82,90,100,25,"#8b3d2a");
  }
}

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle="#061a2a";ctx.fillRect(0,0,W,H);
  if(bgImg){
    ctx.save();ctx.globalAlpha=.28;
    const r=Math.max(W/bgImg.width,H/bgImg.height);
    const iw=bgImg.width*r,ih=bgImg.height*r;
    ctx.drawImage(bgImg,(W-iw)/2,(H-ih)/2,iw,ih);ctx.restore();
  }
  // header
  ctx.fillStyle="rgba(3,17,28,.92)";ctx.fillRect(0,0,W,64);
  ctx.font="900 24px Arial";ctx.fillStyle="#ffe58a";ctx.fillText("RESCUE MATCH",18,40);
  ctx.textAlign="center";ctx.fillStyle="#fff";ctx.fillText("LEVEL 1",W/2,40);
  ctx.textAlign="right";ctx.font="700 18px Arial";ctx.fillText(`ХОДЫ: ${moves}`,W-22,38);
  drawCharacter();
  // board panel
  roundedRect(bx-10,by-10,boardPx+20,boardPx+20,18,"rgba(8,42,66,.95)","rgba(49,204,231,.42)");
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    ctx.fillStyle="rgba(255,255,255,.035)";
    roundedRect(bx+x*cell+2,by+y*cell+2,cell-4,cell-4,12,"rgba(255,255,255,.035)");
    if(board[y][x]) drawTile(board[y][x],x,y,selected&&selected.x===x&&selected.y===y);
  }
  ctx.textAlign="left";ctx.font="900 18px Arial";ctx.fillStyle="#ffe58a";
  ctx.fillText(`СПАСТИ: ${Math.min(progress,goal)}/${goal}`,18,H-28);
  ctx.textAlign="center";ctx.font="600 16px Arial";ctx.fillStyle="#c5efff";
  ctx.fillText("Собери 3 одинаковых элемента",W/2,H-28);
  if(message && performance.now()<messageUntil){
    ctx.font="900 28px Arial";ctx.fillStyle="#fff";
    ctx.shadowColor="#000";ctx.shadowBlur=10;
    ctx.fillText(message,W/2,H*.14);ctx.shadowBlur=0;
    requestAnimationFrame(draw);
  }
}

function loop(){draw();requestAnimationFrame(loop);}
fit();newBoard();loop();

window.addEventListener("error",e=>{
  errorBox.hidden=false;
  errorBox.textContent="Ошибка игры: "+e.message;
});
})();
