define(["app/tool/OTMaps/OTMap","app/tool/OTMaps/Utils/DrawUtil"],function(t,a){function p(a,p){t.apply(this,arguments),this.type="Heat"}return p.prototype=new t,p.prototype.draw=function(t){var p=this;return p.clear(),a.drawHeat(p),p.drawLayer.redraw(),p.backupConfig(),t&&t(),p},p});