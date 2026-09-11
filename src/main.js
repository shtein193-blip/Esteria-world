
const TYPES=["red","blue","green","yellow","purple","orange"];
const W=8,H=8;
let CELL=64;

class Game extends Phaser.Scene{
  constructor(){super("Game");}
  preload(){
    TYPES.forEach(t=>this.load.image("tile_"+t,"assets/tiles/tile_"+t+".png"));
    this.load.image("pirateBg","assets/backgrounds/pirate/main.webp");
    this.load.image("pirate","assets/characters/pirate_01/worried.png");
  }
  create(){
    this.moves=25; this.progress=0; this.goal=12; this.busy=false; this.selected=null;
    this.board=[]; this.sprites=new Map();
    this.makeUI(); this.makeBoard();
    this.input.on("pointerdown",p=>this.click(p));
    this.scale.on("resize",()=>this.layout());
    this.layout();
  }
  makeUI(){
    this.bg=this.add.rectangle(0,0,1,1,0x061a2a).setOrigin(0);
    this.bgImage=this.add.image(0,0,"pirateBg").setAlpha(.26);
    this.top=this.add.rectangle(0,0,1,64,0x041421,.78).setOrigin(0);
    this.title=this.add.text(18,16,"RESCUE MATCH",{fontFamily:"Arial Black",fontSize:"24px",color:"#ffe58a"});
    this.level=this.add.text(0,18,"LEVEL 1",{fontFamily:"Arial Black",fontSize:"22px",color:"#ffffff"}).setOrigin(.5,0);
    this.movesText=this.add.text(0,18,"ХОДЫ: 25",{fontFamily:"Arial",fontSize:"18px",color:"#ffffff"}).setOrigin(1,0);
    this.panel=this.add.rectangle(0,0,10,10,0x082a42,.94).setStrokeStyle(2,0x31cce7,.45);
    this.char=this.add.image(0,0,"pirate").setOrigin(.5,1);
    this.goalText=this.add.text(18,0,"СПАСТИ: 0/12",{fontFamily:"Arial Black",fontSize:"18px",color:"#ffe58a"});
    this.hint=this.add.text(0,0,"Собери 3 одинаковых элемента",{fontFamily:"Arial",fontSize:"16px",color:"#c5efff"}).setOrigin(.5);
  }
  makeBoard(){
    for(let y=0;y<H;y++){this.board[y]=[];for(let x=0;x<W;x++){
      let t; do{t=Phaser.Utils.Array.GetRandom(TYPES);this.board[y][x]=t;}while(this.badAt(x,y));
    }}
    this.render();
  }
  badAt(x,y){
    const t=this.board[y][x];
    return (x>=2&&this.board[y][x-1]===t&&this.board[y][x-2]===t)||(y>=2&&this.board[y-1][x]===t&&this.board[y-2][x]===t);
  }
  pos(x,y){return{x:this.bx+(x+.5)*CELL,y:this.by+(y+.5)*CELL}}
  render(){
    this.sprites.forEach(s=>s.destroy());this.sprites.clear();
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const s=this.add.image(0,0,"tile_"+this.board[y][x]).setDisplaySize(CELL-4,CELL-4);
      s.setData("x",x);s.setData("y",y);this.sprites.set(x+","+y,s);this.setPos(s,x,y,false);
    }
  }
  setPos(s,x,y,tween=true){
    const p=this.pos(x,y);
    if(tween)this.tweens.add({targets:s,x:p.x,y:p.y,duration:170,ease:"Back.out"});
    else{s.x=p.x;s.y=p.y;}
  }
  click(p){
    if(this.busy)return;
    const x=Math.floor((p.x-this.bx)/CELL),y=Math.floor((p.y-this.by)/CELL);
    if(x<0||x>=W||y<0||y>=H)return;
    if(!this.selected){this.selected={x,y};this.highlight(x,y);return}
    const a=this.selected;this.selected=null;this.clearHighlight();
    if(Math.abs(a.x-x)+Math.abs(a.y-y)!==1)return;
    this.swap(a,{x,y});
  }
  highlight(x,y){const s=this.sprites.get(x+","+y);if(s){s.setScale(1.08);s.setTint(0xc9fbff)}}
  clearHighlight(){this.sprites.forEach(s=>{s.clearTint();s.setScale(1)})}
  swap(a,b){
    this.busy=true; this.dataSwap(a,b);
    const sa=this.sprites.get(a.x+","+a.y), sb=this.sprites.get(b.x+","+b.y);
    const pa=this.pos(a.x,a.y),pb=this.pos(b.x,b.y);
    this.tweens.add({targets:sa,x:pa.x,y:pa.y,duration:130});
    this.tweens.add({targets:sb,x:pb.x,y:pb.y,duration:130,onComplete:()=>{
      const m=this.matches();
      if(!m.length){this.dataSwap(a,b);this.tweens.add({targets:sa,x:pb.x,y:pb.y,duration:130});this.tweens.add({targets:sb,x:pa.x,y:pa.y,duration:130,onComplete:()=>this.busy=false});}
      else{this.moves--;this.resolve(m)}
    }});
  }
  dataSwap(a,b){
    [this.board[a.y][a.x],this.board[b.y][b.x]]=[this.board[b.y][b.x],this.board[a.y][a.x]];
    const sa=this.sprites.get(a.x+","+a.y),sb=this.sprites.get(b.x+","+b.y);
    this.sprites.set(a.x+","+a.y,sb);this.sprites.set(b.x+","+b.y,sa);
    sa.setData("x",b.x).setData("y",b.y);sb.setData("x",a.x).setData("y",a.y);
  }
  matches(){
    const set=new Set();
    for(let y=0;y<H;y++){let run=1;for(let x=1;x<=W;x++){if(x<W&&this.board[y][x]===this.board[y][x-1])run++;else{if(run>=3)for(let k=x-run;k<x;k++)set.add(k+","+y);run=1}}}
    for(let x=0;x<W;x++){let run=1;for(let y=1;y<=H;y++){if(y<H&&this.board[y][x]===this.board[y-1][x])run++;else{if(run>=3)for(let k=y-run;k<y;k++)set.add(x+","+k);run=1}}}
    return [...set].map(k=>k.split(",").map(Number));
  }
  resolve(ms){
    this.progress+=ms.length;
    ms.forEach(([x,y])=>{const s=this.sprites.get(x+","+y);if(s){this.tweens.add({targets:s,scale:1.3,alpha:0,duration:120,onComplete:()=>s.destroy()});this.sprites.delete(x+","+y)}});
    this.updateText();
    this.time.delayedCall(130,()=>this.fall());
  }
  fall(){
    for(let x=0;x<W;x++){
      let write=H-1;
      for(let y=H-1;y>=0;y--)if(this.sprites.has(x+","+y)){
        const s=this.sprites.get(x+","+y),t=this.board[y][x];
        this.board[write][x]=t;this.sprites.set(x+","+write,s);
        if(write!==y)this.sprites.delete(x+","+y);
        s.setData("x",x).setData("y",write);this.setPos(s,x,write,true);write--;
      }
      for(let y=write;y>=0;y--){
        const t=Phaser.Utils.Array.GetRandom(TYPES);this.board[y][x]=t;
        const s=this.add.image(this.pos(x,y).x,this.by-CELL*(write-y+1),"tile_"+t).setDisplaySize(CELL-4,CELL-4);
        this.sprites.set(x+","+y,s);this.setPos(s,x,y,true);
      }
    }
    this.time.delayedCall(210,()=>{const m=this.matches();if(m.length)this.resolve(m);else{this.busy=false;this.updateText();this.endCheck()}})
  }
  updateText(){this.movesText.setText("ХОДЫ: "+this.moves);this.goalText.setText("СПАСТИ: "+Math.min(this.progress,this.goal)+"/"+this.goal)}
  endCheck(){
    if(this.progress>=this.goal||this.moves<=0){
      const won=this.progress>=this.goal;
      this.busy=true;
      const ov=this.add.rectangle(this.cx,this.cy,this.scale.width*.78,220,0x04131f,.94).setStrokeStyle(3,won?0xffd75a:0xff6b6b,.7);
      this.add.text(this.cx,this.cy-45,won?"УРОВЕНЬ ПРОЙДЕН!":"ХОДЫ ЗАКОНЧИЛИСЬ",{fontFamily:"Arial Black",fontSize:Math.min(34,this.scale.width/14),color:won?"#ffe27a":"#ff9090"}).setOrigin(.5);
      this.add.text(this.cx,this.cy+10,won?"Пиратка свободна!":"Попробуй ещё раз",{fontSize:22,color:"#ffffff"}).setOrigin(.5);
    }
  }
  layout(){
    const w=this.scale.width,h=this.scale.height,mobile=w<760;
    this.cx=w/2;this.cy=h/2;
    this.bg.setSize(w,h);this.bgImage.setPosition(w/2,h/2).setDisplaySize(w,h);
    this.level.setPosition(w/2,18);this.movesText.setPosition(w-18,18);
    const availableW=mobile?w-24:w*.58, availableH=mobile?h*.52:h-120;
    const size=Math.min(availableW,availableH,620);
    CELL=size/8;
    this.bx=mobile?(w-size)/2:w-size/2+w*.18;
    this.by=mobile?Math.max(90,(h-size)/2+25):(h-size)/2+25;
    this.panel.setPosition(this.bx+size/2,this.by+size/2).setSize(size+18,size+18);
    this.char.setPosition(mobile?90:this.bx-size*.28,this.by+size*.92).setDisplaySize(mobile?120:Math.min(270,size*.48),mobile?300:Math.min(390,size*.68));
    this.goalText.setPosition(18,h-42);this.hint.setPosition(w/2,h-38);
    this.sprites.forEach((s,k)=>{const [x,y]=k.split(",").map(Number);this.setPos(s,x,y,false)});
  }
}
new Phaser.Game({type:Phaser.AUTO,parent:"game",backgroundColor:"#061a2a",scale:{mode:Phaser.Scale.RESIZE,width:"100%",height:"100%"},scene:[Game],render:{antialias:true}});
