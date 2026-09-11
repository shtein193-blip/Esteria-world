import Phaser from "phaser";

type GemType = 0 | 1 | 2 | 3;
type Gem = { type: GemType; sprite: Phaser.GameObjects.Container };

const W = 1100;
const H = 700;
const COLS = 7;
const ROWS = 7;
const CELL = 62;
const BOARD_X = 610;
const BOARD_Y = 430;

const GEM_COLORS = [0xd94b5b, 0x4e91e8, 0x55b86a, 0xe1b84c];
const GEM_SYMBOLS = ["⚔", "✦", "♥", "◆"];

class MainScene extends Phaser.Scene {
  private board: Gem[][] = [];
  private selected: { r: number; c: number } | null = null;
  private inputLocked = false;

  private gold = 120;
  private xp = 0;
  private level = 1;
  private castleHp = 100;

  private wave = 1;
  private enemies: Phaser.GameObjects.Container[] = [];
  private enemyHp = new Map<Phaser.GameObjects.Container, number>();
  private enemyMaxHp = new Map<Phaser.GameObjects.Container, number>();

  private goldText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;
  private boardContainer!: Phaser.GameObjects.Container;
  private enemyLayer!: Phaser.GameObjects.Container;
  private tower!: Phaser.GameObjects.Container;
  private attackTimer?: Phaser.Time.TimerEvent;

  constructor() { super("MainScene"); }

  create() {
    this.createBackground();
    this.createUI();
    this.createBattlefield();
    this.createBoard();
    this.startWave();
    this.startTowerAttack();

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.inputLocked) return;
      this.handleBoardClick(p.x, p.y);
    });
  }

  private createBackground() {
    this.add.rectangle(W/2, H/2, W, H, 0x101522);
    this.add.rectangle(330, 350, 630, 660, 0x172034);
    this.add.rectangle(820, 350, 540, 660, 0x111927);
    this.add.text(38, 24, "ХРОНИКИ ЭТЕРИИ", { fontSize:"28px", fontStyle:"bold", color:"#f5d98a" });
    this.add.text(40, 58, "Fantasy Match-3 × Tower Defense RPG", { fontSize:"14px", color:"#8f9bb3" });
  }

  private createUI() {
    const style = { fontSize:"18px", color:"#ffffff" };
    this.goldText = this.add.text(40, 105, "", style);
    this.hpText = this.add.text(40, 138, "", style);
    this.levelText = this.add.text(40, 171, "", style);
    this.waveText = this.add.text(40, 204, "", style);

    this.xpBarBg = this.add.rectangle(40, 247, 270, 14, 0x30394b).setOrigin(0, 0.5);
    this.xpBar = this.add.rectangle(40, 247, 0, 14, 0x55b86a).setOrigin(0, 0.5);
    this.statusText = this.add.text(40, 275, "Собирай 3+ одинаковых кристалла.", {
      fontSize:"15px", color:"#aeb9ce", wordWrap:{width:300}
    });

    this.updateUI();
  }

  private createBattlefield() {
    this.enemyLayer = this.add.container(0, 0);

    // path
    const g = this.add.graphics();
    g.fillStyle(0x28344a, 1);
    g.fillRoundedRect(365, 115, 560, 180, 20);
    g.fillStyle(0x1c2638, 1);
    g.fillRoundedRect(390, 140, 510, 130, 18);

    // castle
    const castle = this.add.container(880, 205);
    const body = this.add.rectangle(0, 20, 90, 90, 0x6d7282);
    const roof = this.add.triangle(0, -40, -58, 10, 58, 10, 0, -65, 0x9b4d62);
    const flag = this.add.rectangle(0, -82, 4, 35, 0xd8d8d8);
    const flag2 = this.add.triangle(17, -88, 0, -78, 30, -88, 0, -99, 0xe1b84c);
    castle.add([body, roof, flag, flag2]);
    this.add.text(838, 280, "ЗАМОК", {fontSize:"13px", color:"#cbd2df"});

    // tower
    this.tower = this.add.container(450, 215);
    const base = this.add.rectangle(0, 20, 72, 72, 0x697386);
    const roofT = this.add.triangle(0, -35, -48, 8, 48, 8, 0, -50, 0x4e91e8);
    const mage = this.add.text(-13, -6, "🧙", {fontSize:"32px"});
    this.tower.add([base, roofT, mage]);
    this.add.text(414, 280, "МАГ", {fontSize:"13px", color:"#9fb4d8"});
  }

  private createBoard() {
    this.boardContainer = this.add.container(0, 0);
    for (let r = 0; r < ROWS; r++) {
      this.board[r] = [];
      for (let c = 0; c < COLS; c++) {
        this.board[r][c] = this.createGem(r, c, Phaser.Math.Between(0, 3) as GemType);
      }
    }
    // Ensure no starting matches.
    this.removeInitialMatches();
  }

  private createGem(r:number, c:number, type:GemType):Gem {
    const x = BOARD_X + (c - COLS/2 + 0.5) * CELL;
    const y = BOARD_Y + (r - ROWS/2 + 0.5) * CELL;
    const bg = this.add.rectangle(0, 0, CELL-5, CELL-5, GEM_COLORS[type], 1).setStrokeStyle(2, 0xffffff, 0.12);
    const label = this.add.text(0, 0, GEM_SYMBOLS[type], {fontSize:"25px", color:"#ffffff"}).setOrigin(0.5);
    const container = this.add.container(x, y, [bg, label]);
    container.setSize(CELL-5, CELL-5);
    this.boardContainer.add(container);
    return {type, sprite:container};
  }

  private removeInitialMatches() {
    for (let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
      while (this.wouldMatch(r,c,this.board[r][c].type)) {
        this.board[r][c].type = Phaser.Math.Between(0,3) as GemType;
        this.refreshGem(this.board[r][c]);
      }
    }
  }

  private wouldMatch(r:number,c:number,type:GemType):boolean {
    return (c>=2 && this.board[r][c-1]?.type===type && this.board[r][c-2]?.type===type)
      || (r>=2 && this.board[r-1]?.[c]?.type===type && this.board[r-2]?.[c]?.type===type);
  }

  private refreshGem(g:Gem) {
    const bg = g.sprite.list[0] as Phaser.GameObjects.Rectangle;
    const label = g.sprite.list[1] as Phaser.GameObjects.Text;
    bg.setFillStyle(GEM_COLORS[g.type]);
    label.setText(GEM_SYMBOLS[g.type]);
  }

  private handleBoardClick(x:number,y:number) {
    const c = Math.floor((x - (BOARD_X - COLS*CELL/2))/CELL);
    const r = Math.floor((y - (BOARD_Y - ROWS*CELL/2))/CELL);
    if (r<0 || r>=ROWS || c<0 || c>=COLS) return;

    if (!this.selected) {
      this.selected = {r,c};
      this.highlight(r,c,true);
      return;
    }

    const s = this.selected;
    this.highlight(s.r,s.c,false);
    this.selected = null;

    if (Math.abs(s.r-r)+Math.abs(s.c-c)!==1) {
      this.selected = {r,c};
      this.highlight(r,c,true);
      return;
    }

    this.swap(s.r,s.c,r,c);
  }

  private highlight(r:number,c:number,on:boolean) {
    this.board[r][c].sprite.setScale(on?1.08:1);
  }

  private swap(r1:number,c1:number,r2:number,c2:number) {
    if (this.inputLocked) return;
    this.inputLocked = true;
    const a=this.board[r1][c1], b=this.board[r2][c2];
    [this.board[r1][c1],this.board[r2][c2]]=[b,a];

    const ax=a.sprite.x, ay=a.sprite.y;
    const bx=b.sprite.x, by=b.sprite.y;
    this.tweens.add({targets:a.sprite,x:bx,y:by,duration:120});
    this.tweens.add({targets:b.sprite,x:ax,y:ay,duration:120,onComplete:()=>{
      const matches=this.findMatches();
      if(matches.length===0) {
        [this.board[r1][c1],this.board[r2][c2]]=[a,b];
        this.tweens.add({targets:a.sprite,x:ax,y:ay,duration:120});
        this.tweens.add({targets:b.sprite,x:bx,y:by,duration:120,onComplete:()=>this.inputLocked=false});
      } else {
        this.resolveMatches(matches);
      }
    }});
  }

  private findMatches():{r:number,c:number}[] {
    const found = new Set<string>();
    for(let r=0;r<ROWS;r++){
      let start=0;
      while(start<COLS){
        let end=start+1;
        while(end<COLS && this.board[r][end].type===this.board[r][start].type) end++;
        if(end-start>=3) for(let c=start;c<end;c++) found.add(`${r},${c}`);
        start=end;
      }
    }
    for(let c=0;c<COLS;c++){
      let start=0;
      while(start<ROWS){
        let end=start+1;
        while(end<ROWS && this.board[end][c].type===this.board[start][c].type) end++;
        if(end-start>=3) for(let r=start;r<end;r++) found.add(`${r},${c}`);
        start=end;
      }
    }
    return [...found].map(s=>{const [r,c]=s.split(",").map(Number);return {r,c}});
  }

  private resolveMatches(matches:{r:number,c:number}[]) {
    if(matches.length===0){this.inputLocked=false;return;}
    const counts=[0,0,0,0];
    matches.forEach(({r,c})=>counts[this.board[r][c].type]++);
    const damage = 12 + matches.length*5 + counts[0]*7;
    const heal = counts[2]*4;
    const money = counts[3]*5;
    const magic = counts[1]*3;

    this.gold += money;
    this.castleHp=Math.min(100,this.castleHp+heal);
    this.statusText.setText(`Комбо ${matches.length}! Урон башни: ${damage}.`);
    this.damageNearestEnemy(damage + magic*2);

    const old = matches.map(({r,c})=>this.board[r][c].sprite);
    this.tweens.add({targets:old,alpha:0,scale:0.2,duration:160,onComplete:()=>{
      const matchedSet=new Set(matches.map(m=>`${m.r},${m.c}`));
      for(let c=0;c<COLS;c++){
        let write=ROWS-1;
        for(let r=ROWS-1;r>=0;r--){
          if(!matchedSet.has(`${r},${c}`)){
            this.board[write][c]=this.board[r][c];
            write--;
          }
        }
        for(let r=write;r>=0;r--){
          const type=Phaser.Math.Between(0,3) as GemType;
          this.board[r][c]=this.createGem(r,c,type);
          this.board[r][c].sprite.y=BOARD_Y+(r-ROWS/2+0.5)*CELL-ROWS*CELL;
          this.tweens.add({targets:this.board[r][c].sprite,y:BOARD_Y+(r-ROWS/2+0.5)*CELL,duration:220});
        }
        for(let r=0;r<ROWS;r++){
          const g=this.board[r][c];
          g.sprite.x=BOARD_X+(c-COLS/2+0.5)*CELL;
          g.sprite.y=BOARD_Y+(r-ROWS/2+0.5)*CELL;
        }
      }
      this.gainXp(8+matches.length*3);
      this.time.delayedCall(230,()=>{
        const more=this.findMatches();
        if(more.length) this.resolveMatches(more); else this.inputLocked=false;
      });
    }});
  }

  private damageNearestEnemy(dmg:number) {
    const target=this.enemies.find(e=>e.active);
    if(!target) return;
    const hp=Math.max(0,(this.enemyHp.get(target)??0)-dmg);
    this.enemyHp.set(target,hp);
    const bar=target.getData("bar") as Phaser.GameObjects.Rectangle;
    const max=this.enemyMaxHp.get(target)??1;
    bar.width=40*(hp/max);
    this.tweens.add({targets:target,alpha:0.55,duration:70,yoyo:true});
    if(hp<=0) this.killEnemy(target);
  }

  private startWave() {
    this.waveText.setText(`🌊 Волна: ${this.wave}`);
    const count=4+this.wave;
    for(let i=0;i<count;i++){
      this.time.delayedCall(i*900,()=>this.spawnEnemy());
    }
  }

  private spawnEnemy() {
    const enemy=this.add.container(365, 150 + Phaser.Math.Between(-15,15));
    const body=this.add.text(0,0,this.wave%5===0?"👹":"👺",{fontSize:"34px"}).setOrigin(0.5);
    const hpBg=this.add.rectangle(-20,25,40,5,0x3b1f2a).setOrigin(0,0.5);
    const hpBar=this.add.rectangle(-20,25,40,5,0xd94b5b).setOrigin(0,0.5);
    enemy.add([body,hpBg,hpBar]);
    enemy.setData("bar",hpBar);
    const max=45+this.wave*12;
    this.enemyHp.set(enemy,max);
    this.enemyMaxHp.set(enemy,max);
    this.enemyLayer.add(enemy);
    this.enemies.push(enemy);

    this.tweens.add({
      targets:enemy, x:820, duration:Math.max(6000,9000-this.wave*250), ease:"Linear",
      onComplete:()=> {
        if(enemy.active) {
          this.castleHp=Math.max(0,this.castleHp-10);
          this.killEnemy(enemy,false);
          this.updateUI();
          if(this.castleHp<=0) this.gameOver();
        }
      }
    });
  }

  private killEnemy(enemy:Phaser.GameObjects.Container, giveReward=true) {
    if(!enemy.active) return;
    if(giveReward){this.gold+=12;this.gainXp(18);}
    this.tweens.killTweensOf(enemy);
    this.tweens.add({targets:enemy,scale:1.5,alpha:0,duration:180,onComplete:()=>{
      enemy.destroy();
      this.enemies=this.enemies.filter(e=>e!==enemy);
      if(this.enemies.length===0) {
        this.wave++;
        this.time.delayedCall(1000,()=>this.startWave());
      }
      this.updateUI();
    }});
  }

  private startTowerAttack() {
    this.attackTimer=this.time.addEvent({delay:1000,loop:true,callback:()=>{
      this.damageNearestEnemy(8+this.level*2);
    }});
  }

  private gainXp(amount:number) {
    this.xp+=amount;
    while(this.xp>=this.level*100){
      this.xp-=this.level*100;
      this.level++;
      this.gold+=50;
      this.statusText.setText(`✨ Уровень повышен! Теперь ${this.level}.`);
    }
    this.updateUI();
  }

  private updateUI() {
    this.goldText.setText(`🪙 Золото: ${this.gold}`);
    this.hpText.setText(`🏰 Замок: ${this.castleHp}/100`);
    this.levelText.setText(`⚔ Уровень героя: ${this.level}`);
    this.waveText.setText(`🌊 Волна: ${this.wave}`);
    this.xpBar.width=270*Math.min(1,this.xp/(this.level*100));
  }

  private gameOver() {
    this.inputLocked=true;
    this.attackTimer?.remove();
    this.add.rectangle(W/2,H/2,W,H,0x000000,0.72).setDepth(20);
    this.add.text(W/2,H/2-50,"ЗАМОК ПАЛ",{
      fontSize:"44px",fontStyle:"bold",color:"#e58b8b"
    }).setOrigin(0.5).setDepth(21);
    const btn=this.add.rectangle(W/2,H/2+35,240,58,0x4e91e8).setInteractive().setDepth(21);
    this.add.text(W/2,H/2+35,"ИГРАТЬ СНОВА",{fontSize:"19px",fontStyle:"bold",color:"#fff"}).setOrigin(0.5).setDepth(22);
    btn.on("pointerdown",()=>this.scene.restart());
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent:"game",
  width:W,
  height:H,
  backgroundColor:"#101522",
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  render:{antialias:true},
  scene:[MainScene]
});
