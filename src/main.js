
const TILE_TYPES = ["red","blue","green","yellow","purple","orange"];
const W=8,H=8; let CELL=72;
const COLORS={red:0xf04455,blue:0x27bce8,green:0x50c84d,yellow:0xf6c84e,purple:0x9a55dc,orange:0xf28a32};

class RescueMatch extends Phaser.Scene{
  constructor(){super("RescueMatch");}
  preload(){
    for(const t of TILE_TYPES)this.load.svg("tile_"+t,`assets/tiles/tile_${t}.svg`,{width:64,height:64});
    this.load.image("pirateBg","assets/backgrounds/pirate/main.webp");
    this.load.image("pirate","assets/characters/pirate_01/worried.webp");
  }
  create(){
    this.moves=25; this.goal=12; this.damage=0; this.busy=false; this.selected=null;
    this.board=[];
    this.buildUI(); this.createBoard(); this.input.on("pointerdown",p=>this.onPointer(p));
    this.scale.on("resize",()=>this.layout());
    this.layout();
  }
  buildUI(){
    this.bg=this.add.rectangle(0,0,1,1,0x061b2a).setOrigin(0);
    this.sceneBg=this.add.image(0,0,"pirateBg").setOrigin(.5).setAlpha(.34);
    this.title=this.add.text(0,0,"RESCUE MATCH",{fontFamily:"Arial Black",fontSize:"26px",color:"#ffe59b"});
    this.info=this.add.text(0,0,"LEVEL 1",{fontFamily:"Arial Black",fontSize:"20px",color:"#ffffff"});
    this.movesText=this.add.text(0,0,"ХОДЫ: 25",{fontSize:"18px",color:"#ffffff"});
    this.goalText=this.add.text(0,0,"СПАСТИ: 0/12",{fontSize:"18px",color:"#ffffff"});
    this.hint=this.add.text(0,0,"Собери 3 одинаковых элемента",{fontSize:"16px",color:"#bcefff"});
    this.character=this.add.image(0,0,"pirate").setOrigin(.5,1);
    this.boardBg=this.add.rectangle(0,0,1,1,0x08243a,0.92).setStrokeStyle(3,0x2fd8e9,0.25).setOrigin(.5);
    this.grid=new Map();
  }
  createBoard(){
    for(let y=0;y<H;y++){this.board[y]=[];for(let x=0;x<W;x++){
      let t; do{t=Phaser.Utils.Array.GetRandom(TILE_TYPES);this.board[y][x]=t;}while(this.hasMatchAt(x,y));
    }}
    this.renderBoard();
  }
  hasMatchAt(x,y){
    const t=this.board[y][x];
    if(x>=2&&this.board[y][x-1]===t&&this.board[y][x-2]===t)return true;
    if(y>=2&&this.board[y-1][x]===t&&this.board[y-2][x]===t)return true;
    return false;
  }
  renderBoard(){
    for(const s of this.grid.values())s.destroy();
    this.grid.clear();
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const s=this.add.image(0,0,"tile_"+this.board[y][x]).setDisplaySize(CELL-8,CELL-8).setInteractive();
      s.setData({x,y});
      this.grid.set(`${x},${y}`,s);
      this.positionTile(s,x,y,false);
    }
    this.updateLabels();
  }
  positionTile(s,x,y,animate=true){
    const p=this.cellPos(x,y);
    if(animate)this.tweens.add({targets:s,x:p.x,y:p.y,duration:170,ease:"Back.out"});
    else{s.x=p.x;s.y=p.y;}
  }
  cellPos(x,y){return {x:this.boardX+(x+.5)*CELL,y:this.boardY+(y+.5)*CELL};}
  onPointer(pointer){
    if(this.busy)return;
    const x=Math.floor((pointer.x-this.boardX)/CELL),y=Math.floor((pointer.y-this.boardY)/CELL);
    if(x<0||x>=W||y<0||y>=H)return;
    if(!this.selected){this.selected={x,y};this.selectCell(x,y);return;}
    const a=this.selected,b={x,y};this.selected=null;this.clearSelection();
    if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)!==1)return;
    this.trySwap(a,b);
  }
  selectCell(x,y){
    const s=this.grid.get(`${x},${y}`);
    if(s){s.setScale(.9);s.setTint(0xbff8ff);}
  }
  clearSelection(){for(const s of this.grid.values())s.clearTint().setScale(1);}
  trySwap(a,b){
    this.busy=true;this.swapData(a,b);
    const matches=this.findMatches();
    if(!matches.length){
      this.swapData(a,b);
      this.animateSwapBack(a,b);
      this.time.delayedCall(220,()=>this.busy=false);
      return;
    }
    this.moves--; this.animateSwap(a,b,()=>this.resolveMatches(matches));
  }
  swapData(a,b){
    const tmp=this.board[a.y][a.x];this.board[a.y][a.x]=this.board[b.y][b.x];this.board[b.y][b.x]=tmp;
    const sa=this.grid.get(`${a.x},${a.y}`),sb=this.grid.get(`${b.x},${b.y}`);
    this.grid.set(`${a.x},${a.y}`,sb);this.grid.set(`${b.x},${b.y}`,sa);
    sa.setData({x:b.x,y:b.y});sb.setData({x:a.x,y:a.y});
  }
  animateSwap(a,b,cb){
    const sa=this.grid.get(`${b.x},${b.y}`),sb=this.grid.get(`${a.x},${a.y}`);
    const pa=this.cellPos(a.x,a.y),pb=this.cellPos(b.x,b.y);
    this.tweens.add({targets:sa,x:pa.x,y:pa.y,duration:120});
    this.tweens.add({targets:sb,x:pb.x,y:pb.y,duration:120,onComplete:cb});
  }
  animateSwapBack(a,b){this.animateSwap(a,b,()=>this.busy=false);}
  findMatches(){
    const set=new Set();
    for(let y=0;y<H;y++){let run=1;for(let x=1;x<=W;x++){
      if(x<W&&this.board[y][x]===this.board[y][x-1])run++;else{if(run>=3)for(let k=x-run;k<x;k++)set.add(`${k},${y}`);run=1;}
    }}
    for(let x=0;x<W;x++){let run=1;for(let y=1;y<=H;y++){
      if(y<H&&this.board[y][x]===this.board[y-1][x])run++;else{if(run>=3)for(let k=y-run;k<y;k++)set.add(`${x},${k}`);run=1;}
    }}
    return [...set].map(k=>k.split(",").map(Number));
  }
  resolveMatches(matches){
    if(!matches.length){this.busy=false;return;}
    this.damage+=matches.length;
    for(const [x,y] of matches){
      const s=this.grid.get(`${x},${y}`);
      if(s){this.tweens.add({targets:s,scale:1.25,alpha:0,duration:130,onComplete:()=>s.destroy()});this.grid.delete(`${x},${y}`);}
    }
    this.time.delayedCall(145,()=>this.collapseAndRefill());
  }
  collapseAndRefill(){
    for(let x=0;x<W;x++){
      let write=H-1;
      for(let y=H-1;y>=0;y--)if(this.grid.has(`${x},${y}`)){
        const s=this.grid.get(`${x},${y}`);const t=this.board[y][x];
        this.board[write][x]=t;this.grid.set(`${x},${write}`,s);
        if(write!==y)this.grid.delete(`${x},${y}`);
        s.setData({x,y:write});this.positionTile(s,x,write,true);write--;
      }
      for(let y=write;y>=0;y--){
        const t=Phaser.Utils.Array.GetRandom(TILE_TYPES);this.board[y][x]=t;
        const s=this.add.image(this.cellPos(x,y).x,this.boardY+(y+.5)*CELL-CELL,"tile_"+t).setDisplaySize(CELL-8,CELL-8);
        this.grid.set(`${x},${y}`,s);s.setData({x,y});
        this.positionTile(s,x,y,true);
      }
    }
    this.time.delayedCall(230,()=>{
      const again=this.findMatches();
      if(again.length)this.resolveMatches(again); else {this.busy=false;this.updateLabels();this.checkEnd();}
    });
  }
  updateLabels(){
    this.movesText.setText(`ХОДЫ: ${this.moves}`);
    this.goalText.setText(`СПАСТИ: ${Math.min(this.damage,this.goal)}/${this.goal}`);
  }
  checkEnd(){
    if(this.damage>=this.goal||this.moves<=0){
      this.busy=true;
      const won=this.damage>=this.goal;
      const shade=this.add.rectangle(this.centerX,this.centerY,900,500,0x03111c,.88);
      const text=this.add.text(this.centerX,this.centerY-45,won?"УРОВЕНЬ ПРОЙДЕН!":"ХОДЫ ЗАКОНЧИЛИСЬ",{
        fontFamily:"Arial Black",fontSize:"34px",color:won?"#ffe36b":"#ff8f8f",align:"center"
      }).setOrigin(.5);
      const sub=this.add.text(this.centerX,this.centerY+25,won?"Пиратка свободна!":"Попробуй ещё раз",{
        fontSize:"22px",color:"#ffffff"
      }).setOrigin(.5);
      this.add.text(this.centerX,this.centerY+75,won?"Следующий этап — Special Tiles":"Обнови страницу для рестарта",{
        fontSize:"16px",color:"#bcefff"
      }).setOrigin(.5);
    }
  }
  layout(){
    this.centerX=this.scale.width/2;this.centerY=this.scale.height/2;
    const mobile=this.scale.width<760;
    this.boardSize=Math.min(mobile?Math.min(this.scale.width-24,520):620,this.scale.height-(mobile?240:130));
    CELL=this.boardSize/8; // intentional global reassignment for responsive prototype
    this.boardX=this.centerX+(mobile?0:Math.min(260,this.scale.width*.17))-this.boardSize/2;
    this.boardY=this.centerY-this.boardSize/2+25;
    this.boardBg.setPosition(this.boardX+this.boardSize/2,this.boardY+this.boardSize/2).setSize(this.boardSize+16,this.boardSize+16);
    this.sceneBg.setPosition(mobile?this.centerX:this.centerX-180,this.centerY).setDisplaySize(mobile?this.scale.width:this.scale.width*.7,this.scale.height);
    this.character.setPosition(mobile?110:this.centerX-this.boardSize/2-20,this.boardY+this.boardSize*.95).setDisplaySize(mobile?145:250,mobile?220:360);
    this.title.setPosition(18,12);this.info.setPosition(this.centerX-55,15);
    this.movesText.setPosition(this.scale.width-150,15);this.goalText.setPosition(20,this.scale.height-35);
    this.hint.setPosition(this.centerX-150,this.scale.height-35);
    for(const [key,s] of this.grid){const [x,y]=key.split(",").map(Number);this.positionTile(s,x,y,false);}
  }
}
const config={
  type:Phaser.AUTO,
  parent:"game",
  backgroundColor:"#061b2a",
  scale:{mode:Phaser.Scale.RESIZE,width:"100%",height:"100%"},
  scene:[RescueMatch],
  render:{antialias:true,pixelArt:false}
};
new Phaser.Game(config);
