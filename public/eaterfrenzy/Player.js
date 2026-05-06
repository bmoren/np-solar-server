class Player{
  constructor() {
    
//DO NOT CHANGE THESE 
    this.playerMouseX = 0;
    this.playerMouseY = 0;
    this.alive = true;
    
// this can change
    this.score = 0;
  }

  collision(goobers) {
    for(let i = 0; i < goobers.length; i++){

      let localHit = collideCircleCircle(this.playerMouseX, this.playerMouseY, 10, goobers[i].x, goobers[i].y, goobers[i].size);
      
      if (localHit === true){
          this.alive = false 
          }
 
      if(localHit === true){
        //console.log("hit");
      }
    }
  }
  
  renderPlayer() {
    if (this.alive == true) {
      this.playerMouseX = mouseX;
      this.playerMouseY = mouseY;
      push();
      noStroke();
      fill(255,255,255,100);
      ellipse(this.playerMouseX,this.playerMouseY, 10, 10);
      pop();
    }else{ //visual death state
      push();
      fill(255, 0, 0, 255);
      ellipse(this.playerMouseX,this.playerMouseY, 10, 10);
      pop();
    }//end of if/else
  }// end of renderPlayer
  
  scoreCounter(){
    if (this.alive === true){
      this.score++
    }else{
      console.log(this.score);
    }
  }//end of score counter
  
}//end of Player Class

