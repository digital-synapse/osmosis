var ENEMY_MIN_RADIUS = 19;
var ENEMY_MAX_RADIUS = 40;
var MAX_SPHERES = 300;
var WORLD_RADIUS = 1000;
var WORLD_CENTERX = 10000000;
var WORLD_CENTERY = 10000000;
var GRAVITY = 4;
var WORLD_SCALE = 1;
var GROWTH_RATE = 0.25;
var GAME_SPEED;
var scale = [
    'Molecule',
    'Dust Particle',
    'Sand Grain',
    'Small Pebble',
    'Rock',
    'Boulder',
    'Meteorite',
    'Asteroid',
    'Moon',
    'Dwarf Planet',
    'Planet',
    'Gas Giant',
    'Star',
    'Red Giant',
    'Solar System',
    'Galaxy',
    'Black Hole'
];
var GAMESTATE = {
    TITLE_SCREEN: 0,
    GAME_TRAINING: 1,
    GAME_RUNNING: 2,
};
var gameState = GAMESTATE.TITLE_SCREEN;
var scalar = 1 / 512;
var spheres = [];
var player;
var projectileTime;
var collideWorldBoundary = true;
var scene;
var group;
var border;
var bordermask;
var keys;
var levelExpanding = false;
var level = 0;
var score = 0;
var scoreText;
var stageText;
var massText = null;
var background;
var paralax;
var fullscreenButton;
var isFullscreen = false;
var updateTime = (new Date()).getTime();
var gameWidth = 800;
var gameHeight = 600;
var game = new Phaser.Game(gameWidth, gameHeight,Phaser.AUTO, 'osmosis', { preload: preload, create: create, update: update, render: render });

function preload() {
    game.load.image('sphere512', '../assets/sphere512.png');
    game.load.image('starfield', '../assets/background1.png');
    game.load.image('fullscreen', '../assets/fullscreen.jpg');

    game.time.advancedTiming = true;
    if (!game.device.desktop) {
        game.scale.forceOrientation(true, false);
    }
    game.load.bitmapFont('scorefont', '../assets/font.png', '../assets/font.xml');
}
function fullscreen() {
    if (!isFullscreen) {
        isFullscreen = true;
        if (fullscreenButton) fullscreenButton.destroy(true);
        var ratio = window.devicePixelRatio || 1;
        gameWidth = screen.width * ratio;
        gameHeight = screen.height * ratio;
        resize(gameWidth, gameHeight);
        game.scale.fullScreenScaleMode = Phaser.ScaleManager.EXACT_FIT;
        game.scale.startFullScreen(false);
    }
}
function resize(width, height) {
    var oldWidth = game.width;
    var oldHeight = game.height;
    game.width = width;
    game.height = height;
    game.camera.width = width;
    game.camera.height = height;
    game.camera.view.width = width;
    game.camera.view.height = height;
    game.scale.refresh();
    if (game.renderType === Phaser.WEBGL) {
        game.renderer.resize(width, height);
    }    
    positionHUD();
    
}
function positionHUD() {

    scoreText.cameraOffset.x = game.camera.view.width - scoreText.textWidth - 10;
    scoreText.cameraOffset.y = 10;

    levelText.cameraOffset.x =  game.camera.view.width - scoreText.textWidth - 10 - levelText.textWidth - 15;
    levelText.cameraOffset.y = 20;

    massText.cameraOffset.x = levelText.cameraOffset.x + 1;
    massText.cameraOffset.y = scoreText.cameraOffset.y + 38;
}
function updateScore(prevscore, nextscore) {
    var tween = { score: prevscore };
    game.add.tween(tween)
    .to({ score: nextscore }, 100, Phaser.Easing.Linear.Out, true)
    .onUpdateCallback(function () {
        scoreText.setText(formatScoreText(tween.score));
    })
    .onChainComplete(function () {
        score = nextscore;
        scoreText.setText(formatScoreText(score));
    });
}
function updateMassText() {

    massText.setText(getMassText());
}
function formatScoreText(score) {
    return pad(Phaser.Math.wrap(parseInt(score), 0, 999999999), 10);
}
function getLevelText() {
    return 'Level: ' + pad(level+1,2).toString();
}
function getMassText() {
    return scale[Math.floor((level+1)/3)];
}
function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}
function makeSphere(x,y,radius) {
    var sphere;
    var diameter = radius * 2;
    var scale = scalar * diameter;

    sphere = game.add.sprite(x, y, 'sphere512');
    //sphere.alpha = 0.8;
    sphere.scale.x = scale;
    sphere.scale.y = scale;
    sphere.properties = {
        radius: radius,
        diameter: diameter,
        scale: scale,
        collided: false
    };
    game.physics.p2.enable(sphere, false);
    sphere.body.setCircle(radius).sensor=true;
    sphere.body.fixedRotation = true;
    sphere.body.enabled = false;
    sphere.tint = 0x3399ff;
    spheres.push(sphere);
    group.add(sphere);
    return sphere;
}
function create() {
    keys = {
        up: game.input.keyboard.addKey(Phaser.Keyboard.UP),
        down: game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
        right: game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
        esc: game.input.keyboard.addKey(27)
    };
    keys.esc.onDown.add(fullscreen, this);

    game.physics.startSystem(Phaser.Physics.P2JS);
    game.physics.p2.restitution = 0.9;
    game.physics.p2.friction = 0.01;

    game.world.setBounds(0, 0, WORLD_CENTERX * 2, WORLD_CENTERY * 2);

    scene = game.add.group();
   
    border = game.add.graphics(0, 0);
    border.lineStyle(4, 0x0000FF, 2);
    border.beginFill(0,1);    
    border.drawCircle(WORLD_CENTERX, WORLD_CENTERY, WORLD_RADIUS+1);
    border.endFill();
    border.properties = {
        radius: WORLD_RADIUS
    };
    scene.add(border);

    group = game.add.group();         
    bordermask = game.add.graphics(0, 0);
    bordermask.beginFill();    
    bordermask.drawCircle(WORLD_CENTERX, WORLD_CENTERY, WORLD_RADIUS);    
    group.mask = bordermask;
    group.add(bordermask);
    scene.add(group);

    // create enemies
    for (var i = 0; i < MAX_SPHERES-spheres.length; i++) {
        var rp = ((Math.random() * (WORLD_RADIUS - 150)) + 20);
        var r = (Math.random() * (ENEMY_MAX_RADIUS-ENEMY_MIN_RADIUS) + ENEMY_MIN_RADIUS) * (rp/WORLD_RADIUS );
        var d = r * 2;        
        var a = (Math.random() * Math.PI * 2) - Math.PI;
        var x = WORLD_CENTERX + Math.cos(a) * rp;
        var y = WORLD_CENTERY + Math.sin(a) * rp;        
        var sphere = makeSphere(x, y, r);
        sphere.body.velocity.x = ((Math.random() * 20) - 10);
        sphere.body.velocity.y = ((Math.random() * 20) - 10);
    }

    // ----------------------------------------------

    // create player
    player = makeSphere(WORLD_CENTERX, WORLD_CENTERY, 20);
    player.properties.isPlayer = true;

    game.camera.follow(player);

    background = game.add.tileSprite(WORLD_CENTERX, WORLD_CENTERY, WORLD_RADIUS*2.5, WORLD_RADIUS*2.5, 'starfield');
    background.anchor.setTo(0.5, 0.5);
    group.add(background);
    group.sendToBack(background);
  

    scoreText = game.add.bitmapText(
        game.camera.view.x + game.camera.view.width,
        game.camera.view.y,
        "scorefont",
        formatScoreText(0),
        70);
    scoreText.fixedToCamera = true;

    levelText = game.add.bitmapText(
        0,0,
        "scorefont",
        getLevelText(),
        25);
    levelText.fixedToCamera = true;

    massText = game.add.bitmapText(
        0, 0, "scorefont",
        getMassText(),
        14);
    massText.fixedToCamera = true;

    positionHUD();

    fullscreenButton = game.add.button(0, 0, 'fullscreen', fullscreen);
    fullscreenButton.fixedToCamera = true;
    fullscreenButton.cameraOffset.x = game.camera.view.width - fullscreenButton.width - 10;
    fullscreenButton.cameraOffset.y = game.camera.view.height - fullscreenButton.height - 10;

    game.camera.scale.x = game.camera.scale.y = 0.9;
    updateWorldScale();
}
function expandLevel(onComplete) {
    collideWorldBoundary = false;
    ENEMY_MAX_RADIUS = WORLD_RADIUS / 20 - (level * 0.1);  //player.properties.radius* (1.5 / (level+2));
    ENEMY_MIN_RADIUS = player.properties.radius* 0.1;
    
    // create enemies

    var qty = (MAX_SPHERES - spheres.length);
    if (qty > 0)
    {
    for (var i = 0; i < qty ; i++) {
        var rp = ((Math.random() * ((WORLD_RADIUS*0.5) - ENEMY_MAX_RADIUS)) + WORLD_RADIUS+ ENEMY_MAX_RADIUS);
        var r = (Math.random() * (ENEMY_MAX_RADIUS - ENEMY_MIN_RADIUS)) + ENEMY_MIN_RADIUS;
        var d = r * 2;
        var a = (Math.random() * Math.PI * 2) - Math.PI;
        var x = WORLD_CENTERX + Math.cos(a) * rp;
        var y = WORLD_CENTERY + Math.sin(a) * rp; 
        var sphere = makeSphere(x, y, r);
        //sphere.body.velocity.x = (Math.random() * 50) - 25;
        //sphere.body.velocity.y = (Math.random() * 50) - 25;
    }
    }
    group.sendToBack(background);
    
    game.add.tween(game.camera.scale)
    .to({
        x: game.camera.scale.x / 1.5,
        y: game.camera.scale.y / 1.5
    }, 6000, Phaser.Easing.Cubic.Out, true)
    .onUpdateCallback(updateWorldScale);
    

    border.properties = {
        radius: WORLD_RADIUS
    };
    game.add.tween(border.properties).to({
        radius: WORLD_RADIUS * 1.5
    },
    4000, Phaser.Easing.Back.Out, true, 1000)
    .onUpdateCallback(function () {
        border.clear();
        border.lineStyle(WORLD_SCALE*4, 0x0000FF, 1);
        border.beginFill(0, 1);
        border.drawCircle(WORLD_CENTERX, WORLD_CENTERY, border.properties.radius+WORLD_SCALE);
        border.endFill();
        bordermask.clear();
        bordermask.beginFill(0x000055);
        bordermask.drawCircle(WORLD_CENTERX, WORLD_CENTERY, border.properties.radius);
        bordermask.endFill();
        group.mask = bordermask;
        group.bringToTop(bordermask);

    }, border)
    .onChainComplete(function () {
        WORLD_RADIUS = border.properties.radius;
        collideWorldBoundary = true;
        if (onComplete) onComplete();
    });

}
function updateWorldScale() {
    WORLD_SCALE = 1 / game.camera.scale.x;
    scoreText.scale.setTo(WORLD_SCALE, WORLD_SCALE);
    levelText.scale.setTo(WORLD_SCALE, WORLD_SCALE);
    massText.scale.setTo(WORLD_SCALE, WORLD_SCALE);    
    background.tilePosition.x = -(WORLD_CENTERX - player.position.x) / (2 * WORLD_SCALE);
    background.tilePosition.y = -(WORLD_CENTERY - player.position.y) / (2 * WORLD_SCALE);
    background.scale.setTo(WORLD_SCALE, WORLD_SCALE);
    fullscreenButton.scale.setTo(WORLD_SCALE, WORLD_SCALE);
}
function hit(sprite1, sprite2, overlap) {

            if (sprite1.properties.radius > sprite2.properties.radius) {
                sprite1.properties.radius += (overlap* GROWTH_RATE);
                sprite2.properties.radius -= overlap;
                if (sprite1.properties.isPlayer) {                    
                    if (sprite1.properties.radius > ENEMY_MAX_RADIUS * 2.1) sprite1.properties.radius = ENEMY_MAX_RADIUS * 2.1;
                }
                else {
                    if (sprite1.properties.radius > ENEMY_MAX_RADIUS*2) sprite1.properties.radius = ENEMY_MAX_RADIUS*2;
                }
                if (sprite2.properties.radius <= 0) {
                    if (sprite1.properties.isPlayer) {
                        var x = (sprite1.properties.radius / 100);
                        var prevscore = score;
                        score += x < 10 ? 10 : x;
                        updateScore(prevscore,score);
                    }
                    
                    group.remove(sprite2);
                    sprite2.kill();
                    sprite2.properties.dead = true;
                }
            }
            else {
                sprite1.properties.radius -= overlap;
                sprite2.properties.radius += (overlap * GROWTH_RATE);
                if (sprite2.properties.isPlayer) {                    
                    if (sprite2.properties.radius > ENEMY_MAX_RADIUS * 2.1) sprite2.properties.radius = ENEMY_MAX_RADIUS * 2.1;
                }
                else {
                    if (sprite2.properties.radius > ENEMY_MAX_RADIUS*2) sprite2.properties.radius = ENEMY_MAX_RADIUS * 2;
                }
                if (sprite1.properties.radius <= 0) {
                    if (sprite2.properties.isPlayer) {
                        var x = (sprite1.properties.radius / 100);
                        var prevscore = score;
                        score += x < 10 ? 10 : x;
                        updateScore(prevscore, score);
                    }

                    group.remove(sprite1);
                     sprite1.kill();                    
                    sprite1.properties.dead = true;
                }
            }
            sprite1.properties.diameter = sprite1.properties.radius * 2;
            sprite2.properties.diameter = sprite2.properties.radius * 2;
            sprite1.properties.scale = sprite1.properties.diameter * scalar;
            sprite2.properties.scale = sprite2.properties.diameter * scalar;
            sprite1.scale.x = sprite1.scale.y = sprite1.properties.scale;
            sprite2.scale.x = sprite2.scale.y = sprite2.properties.scale;
}
function circleCollision(sprite1, sprite2, dist) {
    // return a positive number on collision
    return sprite1.properties.radius + sprite2.properties.radius - dist;  // if distance to each other is smaller than both radii together a collision/overlap is happening
}
function worldCollision(sprite) {
    var dx = sprite.body.x - WORLD_CENTERX; 
    var dy = sprite.body.y - WORLD_CENTERY; 
    var dist = Math.sqrt(dx * dx + dy * dy);     //pythagoras ^^  (get the distance to each other)
    return dist + sprite.properties.radius - border.properties.radius; //WORLD_RADIUS;
}
function circleGravity(sprite1, sprite2, dist,dx,dy) {
    var m1 = sprite1.properties.radius ;
    var m2 = sprite2.properties.radius ;
    if (dist < (m1 + m2) * 2) {          // local gravity only
        var force = GRAVITY * ((m1 * m2) / dist);
        var a = Math.atan2(dy, dx);
        sprite1.body.velocity.x += (Math.cos(a) * (force * -1 /m1) * WORLD_SCALE * GAME_SPEED);
        sprite1.body.velocity.y += (Math.sin(a) * (force * -1 / m1) * WORLD_SCALE * GAME_SPEED);
        sprite2.body.velocity.x += (Math.cos(a) * (force / m2) * WORLD_SCALE * GAME_SPEED);
        sprite2.body.velocity.y += (Math.sin(a) * (force / m2) * WORLD_SCALE * GAME_SPEED);
    }
}
function correctCollisionWorldBoundary(sphere) {
    var x = sphere.position.x;
    var y = sphere.position.y;
    var r = sphere.properties.radius;
    var o = worldCollision(sphere)
    if (o > 0) {
        var vx = sphere.body.velocity.x;
        var vy = sphere.body.velocity.y;
        var normal = Math.atan2(y - WORLD_CENTERY, x - WORLD_CENTERX);
        sphere.body.x += Math.cos(normal) * o * -1; // correct sphere (do not allow any overlap)
        sphere.body.y += Math.sin(normal) * o * -1;
        var angle = Math.atan2(vy, vx);
        var scale = Math.sqrt(vy * vy + vx * vx);
        var newangle = Phaser.Math.wrapAngle(((angle - normal) * -1) + normal + Math.PI, true);
        sphere.body.velocity.y = (Math.sin(newangle) * scale) * GAME_SPEED;
        sphere.body.velocity.x = (Math.cos(newangle) * scale) * GAME_SPEED;
    }
}
function updateLogic() {

    // precalculate distace for physics pairs
    for (var i = 0; i < spheres.length; i++) {
        for (var z = i + 1; z < spheres.length; z++) {
            var sprite1 = spheres[i];
            var sprite2 = spheres[z];
            var dx = sprite1.body.x - sprite2.body.x;  //distance ship X to enemy X
            var dy = sprite1.body.y - sprite2.body.y;  //distance ship Y to enemy Y
            var dist = Math.sqrt(dx * dx + dy * dy);     //pythagoras ^^  (get the distance to each other)

            // simulate local gravity
            circleGravity(sprite1, sprite2, dist,dx,dy);

            // check collision
            var overlap = circleCollision(sprite1, sprite2, dist);
            if (overlap > 0) {
                hit(sprite1, sprite2, overlap);
            }

        }
    }
    // remove dead spheres    
    for (var i = 0; i < spheres.length; i++) {
        if (spheres[i].properties.dead) {
            spheres.splice(i, 1);
            i--;
        }
    }
    
    // check collision with world boundary
    if (levelExpanding) {
        correctCollisionWorldBoundary(player);
    }
    else{
        for (var i = 0; i < spheres.length; i++) {
            correctCollisionWorldBoundary(spheres[i]);
        }
    }

}
function update() {
    var deltaTime = (new Date()).getTime() - updateTime;
    updateTime = (new Date()).getTime();
    GAME_SPEED = deltaTime * 0.05;
    updateLogic();

    // tint based on mass compared to player
    var largest;
    for (var i = 0; i < spheres.length; i++) {
        var r = spheres[i].properties.radius;
        if (largest===undefined || largest.properties.radius < r) largest = spheres[i];

        if (!spheres[i].properties.isPlayer) {
            var redshift = (r - player.properties.radius) * 10;
            var step = 10 + redshift;
            if (step > 20) step = 20;
            if (step < 0) step = 0;
            var tint = Phaser.Color.interpolateColor24(
            0x3399ff,
            0xff3333,
            20, step);

            spheres[i].tint = tint;
        }
    }

    // player is the most massive?
    if (largest == player && spheres.length <= 100) {
        if (!levelExpanding) {
            levelExpanding = true;
            expandLevel(function () {
                levelExpanding = false;
                level++;
                levelText.setText(getLevelText());
                //massText.setText(getMassText());
                updateMassText();
            });
        }
    }

    // player movement
    if (game.input.activePointer.isDown) {
        var angle = Math.atan2(game.input.worldY - player.position.y, game.input.worldX - player.position.x);
        angle = Phaser.Math.wrapAngle(angle - Math.PI, true);
        // using radius as mass
        var mass = player.properties.radius * 0.2;

        player.body.velocity.x += (Math.cos(angle) * mass * GAME_SPEED);  // normally this would be velocity/mass
        player.body.velocity.y += (Math.sin(angle) * mass * GAME_SPEED);  // but i want more massive orbs to move faster (larger spheres expel mass preportionally faster)

        // make projectiles
        if (!projectileTime || projectileTime < (new Date().getTime())) {
            projectileTime = new Date().getTime() + 200;

            var angle = Phaser.Math.wrapAngle(angle - Math.PI, true);
            var mass = player.properties.radius * 0.15;

            player.properties.radius *= 0.995; // shrink player
            player.properties.diameter = player.properties.radius * 2;
            player.properties.scale = player.properties.diameter * scalar;
            player.scale.x = player.scale.y = player.properties.scale;            

            var x = (Math.cos(angle) * (player.properties.radius + mass)) + player.position.x;
            var y = (Math.sin(angle) * (player.properties.radius + mass)) + player.position.y;
            var projectile = makeSphere(x, y, mass);
            projectile.body.velocity.x = (Math.cos(angle) * player.properties.radius * 10) * GAME_SPEED;
            projectile.body.velocity.y =( Math.sin(angle) * player.properties.radius * 10) * GAME_SPEED;
        }
    }
    
}
function render() {
    
    //game.debug.text('FPS: ' + (game.time.fps || '--'), 2, 14, "#00ff00");
    //game.debug.text('Speed: ' +(parseInt(GAME_SPEED * 100)/100), 2, 28, "#00ff00");
    
        /*
    game.debug.text('Bodies: ' +spheres.length, 2, 28, "#00ff00");
    game.debug.text('Stage: ' + scale[level], 2, 42, "#ffffff");
    game.debug.text('Score: ' + pad(Phaser.Math.wrap(parseInt(score),0,999999999),10), 2, 56, "#ffffff"); 
*/
}