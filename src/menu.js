
var Fade = ds.make.class({
    type: 'Fade',
    constructor: function (fadeColor) {
        this.fadeColor = fadeColor;
        this.bg = this.game.add.graphics(0, 0);
        this.bg.beginFill(this.fadeColor, 1);
        this.bg.drawRect(0, 0, this.game.width, this.game.height);
        this.bg.alpha = 0;
        this.bg.endFill();

        var s = this.game.add.tween(spr_bg)
        s.to({ alpha: 1 }, 500, null)
        s.onComplete.add(this.changeState, this)
        s.start();
    },
    changeState: function () {
    },
    fadeOut: function () {
        var s = this.game.add.tween(spr_bg)
        s.to({ alpha: 0 }, 500, null)
        s.onComplete.add(this.changeState, this)
        s.start();
    }
});