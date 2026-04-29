class character{
  
  
   constructor(imagefiletemp){
    this.xPos = 
    this.yPos = 
    this.sz = (75,75)
    this.speed = 
    this.dirY = 1
    this.dirX = 1
     this.imagefile = imagefiletemp
     this.show = 'visible'
    // this.enemy = img;
  }
  
  
  render(){
    if(this.show === 'visible'){
       image(this.imagefile, this.xPos, this.yPos, this.sz, this.sz)
    }
  }
}