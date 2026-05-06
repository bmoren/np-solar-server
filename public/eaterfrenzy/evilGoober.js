class evilGoober{
  constructor() {
    this.x = random(0,windowWidth);
    this.y = random(0,windowHeight);
    this.size = random(10,50);
    this.dirX = random(-1,1);
    this.dirY = random(-1,1);
    this.rR = random(50,255);
    this.rG = random(50,255);
    this.rB = random(50,255);
    this.speed = random(1, 10);
   
  }//constructor end
  
  renderGoober() {
    push()
    noStroke();
    fill(this.rR,this.rB,this.rG,255);
    ellipse(this.x ,this.y, this.size, this.size);
    pop()
  }//end of render
  
  moveGoober() {
    this.y = this.y + this.speed * this.dirY;
    this.x = this.x + this.speed * this.dirX;
  }//move eater end
  
  noLeave(){
  
    if(this.x >= width){
      this.dirX = -1
    }
  
    if(this.x <= 0){
      this.dirX = 1
    }

    if(this.y >= height){
      this.dirY = -1
    }
  
    if(this.y <= 0){
      this.dirY = 1
    }
  }//noLeave End
}//end of EVIL GOOBER

