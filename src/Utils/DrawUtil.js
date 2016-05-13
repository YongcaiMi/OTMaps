/**
 * @author 张伟佩
 * @version 1.0
 * @date 2016-05-08
 * @description 核心绘制组件
 */
define(["app/tool/OTMaps/Utils/ColorUtil", "esri/Color", "app/tool/OTMaps/components/Legend", "esri/symbols/TextSymbol", "esri/geometry/Polygon", "esri/geometry/Point",
        "esri/layers/LabelClass", "esri/symbols/Font", "esri/InfoTemplate", "esri/layers/FeatureLayer", "esri/tasks/query", "esri/graphic", "esri/geometry/Extent",
        "esri/symbols/SimpleFillSymbol", "esri/symbols/SimpleLineSymbol", "esri/symbols/SimpleMarkerSymbol",
        "esri/renderers/smartMapping", "esri/renderers/ClassBreaksRenderer", "esri/renderers/HeatmapRenderer"],
    function (ColorUtil, Color, Legend, TextSymbol, Polygon, Point,
              LabelClass, Font, InfoTemplate, FeatureLayer, Query, Graphic, Extent,
              SimpleFillSymbol, SimpleLineSymbol, SimpleMarkerSymbol,
              smartMapping, ClassBreaksRenderer, HeatmapRenderer) {
        function DrawUtil() {
        }

        var diffField = "tagForDiffColor";
        /* 创建方法 */
        //创建普通统计图层
        DrawUtil.prototype.createSLayer = function (me, callback) {
            var obj = this;
            if (!me.draw || !me.clear) return false;
            var layerConfig = me.config.layer;
            //必要属性检查
            if (typeof me.config.layer.statTag === 'string')
                me.config.layer.statTag = [me.config.layer.statTag];
            if (!me.map)
                throw new Error('OTMaps Error 1001：[map] is required in config,use [setConfig] method to fix it');
            if ((!layerConfig.statTag.length && !layerConfig.baseTag && me.type != 'Heat') || !layerConfig.url)
                throw new Error('OTMaps Error 1002：some required params absent in layer config,use [setConfig] or [setLayer] method to fix it');

            var infoTemplate = me.config.popup.show ? new InfoTemplate(me.config.popup) : null;
            var layer = new FeatureLayer(layerConfig.url, {
                "mode": FeatureLayer.MODE_SNAPSHOT,
                "opacity": 1
            });
            var query = new Query();
            query.outFields = ["*"];
            query.where = "1=1";
            layer.queryFeatures(query, function (data) {
                data.fields.push({
                    "name": diffField,
                    "alias": "区分颜色",
                    "type": "esriFieldTypeDouble"
                });
                var features = [];
                data.features.forEach(function (v, i) {
                    var attr = {};
                    for (var att in v.attributes)
                        attr[att] = v.attributes[att];
                    attr[diffField] = i;
                    var graphic = new Graphic(v.geometry);
                    graphic.setAttributes(attr);
                    features.push(graphic);
                });
                me._features = features;
                var featureCollection = {
                    "layerDefinition": {
                        "geometryType": data.geometryType,
                        "fields": data.fields
                    },
                    "featureSet": {
                        "features": [],
                        "geometryType": data.geometryType
                    }
                };
                me.drawLayer = me.shareProp.drawLayer = new FeatureLayer(featureCollection, {
                    id: layerConfig.id,
                    mode: FeatureLayer.MODE_SNAPSHOT,
                    infoTemplate: infoTemplate,
                    opacity: 1
                });

                me._binded && me._binded.remove();
                me._binded = me.map.on("layers-add-result", function () {
                    debugger;
                    me.drawLayer.applyEdits(features, null, null);
                    callback && callback();
                });
                me.map.addLayers([me.drawLayer]);
            });
        };

        //结合统计数据，创建统计图层
        DrawUtil.prototype.createMLayer = function (me, callback) {
            var obj = this;
            if (!me.draw || !me.clear) return false;
            var layerConfig = me.config.layer;
            //必要属性检查
            if (typeof me.config.layer.statTag === 'string')
                me.config.layer.statTag = [me.config.layer.statTag];
            if (!me.map)
                throw new Error('OTMaps Error 1001：[map] is required in config,use [setConfig] method to fix it');
            if (!layerConfig.url || !layerConfig.corString.length || (!layerConfig.statTag.length && !layerConfig.baseTag))
                throw new Error('OTMaps Error 1002：some required params absent in layer config,use [setConfig] or [setLayer] method to fix it');
            var infoTemplate = me.config.popup.show ? new InfoTemplate(me.config.popup) : null;
            var layer = new FeatureLayer(layerConfig.url, {
                "mode": FeatureLayer.MODE_SNAPSHOT,
                "opacity": 1
            });
            var query = new Query();
            query.outFields = ["*"];
            query.where = "1=1";
            layer.queryFeatures(query, function (data) {
                //添加字段
                data.fields.push({
                    "name": diffField,
                    "alias": "区分颜色",
                    "type": "esriFieldTypeDouble"
                });
                layerConfig.baseTag && data.fields.push({
                    "name": layerConfig.baseTag,
                    "alias": "底图统计数据",
                    "type": "esriFieldTypeDouble"
                });
                layerConfig.statTag.length && layerConfig.statTag.forEach(function (tag, i) {
                    data.fields.push({
                        "name": tag,
                        "alias": "统计数据" + i,
                        "type": "esriFieldTypeDouble"
                    });
                });
                var features = [];
                //添加数据
                data.features.forEach(function (v, i) {
                    var attr = {};
                    attr[diffField] = i;
                    for (var att in v.attributes)
                        attr[att] = v.attributes[att];
                    if (!obj.getCorData(layerConfig.statData, v, layerConfig.corString, layerConfig.baseTag) === false)
                        attr[layerConfig.baseTag] = obj.getCorData(layerConfig.statData, v, layerConfig.corString, layerConfig.baseTag);
                    layerConfig.statTag.length && layerConfig.statTag.forEach(function (tag) {
                        if (!obj.getCorData(layerConfig.statData, v, layerConfig.corString, tag) === false)
                            attr[tag] = obj.getCorData(layerConfig.statData, v, layerConfig.corString, tag);
                    });
                    var graphic = new Graphic(v.geometry);
                    graphic.setAttributes(attr);
                    features.push(graphic);
                });
                me._features = features;
                var featureCollection = {
                    "layerDefinition": {
                        "geometryType": data.geometryType,
                        "fields": data.fields
                    },
                    "featureSet": {
                        "features": [],
                        "geometryType": data.geometryType
                    }
                };
                me.drawLayer = me.shareProp.drawLayer = new FeatureLayer(featureCollection, {
                    id: layerConfig.id,
                    mode: FeatureLayer.MODE_SNAPSHOT,
                    infoTemplate: infoTemplate,
                    opacity: 1
                });

                me._binded && me._binded.remove();
                me._binded = me.shareProp._binded = me.map.on("layers-add-result", function () {
                    me.drawLayer.applyEdits(features, null, null);
                    callback && callback();
                });
                me.map.addLayers([me.drawLayer]);
            });
        };

        //创建标注
        DrawUtil.prototype.createLabel = function (me) {
            if (!me.draw || !me.clear) return false;
            var labelConfig = me.config.label;
            if (!labelConfig.field)
                throw new Error('OTMaps Error 1003：[field] is required in label config,use [setConfig] method to fix it');
            me._features.forEach(function (feature) {
                    var geometry = feature.geometry;
                    var center = geometry.getCentroid();
                    //标注位置
                    var point = new Point(center.x + labelConfig.xoffset, center.y + labelConfig.yoffset, feature.spatialReference);
                    //标注样式
                    var statesLabel = new TextSymbol(feature.attributes[labelConfig.field]).setColor(labelConfig.color);
                    statesLabel.font.setSize(labelConfig.size + "pt");
                    if (labelConfig.bold)
                        statesLabel.font.setWeight(Font.WEIGHT_BOLD);
                    statesLabel.font.setFamily(labelConfig.family);

                    me.drawLayer.add(new Graphic(point, statesLabel));
                }
            );
        };

        //创建图例
        DrawUtil.prototype.createLegend = function (me) {
            if (!me.draw || !me.clear) return false;
            var legendConfig = me.config.legend;
            if (!legendConfig.id)
                throw new Error('OTMaps Error 1004：[id] is required in label config,use [setConfig] method to fix it');
            if (me.shareProp.legend)
                me.shareProp.legend.destroy();

            me.legend = me.shareProp.legend = new Legend({
                map: me.map,
                id: legendConfig.id,
                title: legendConfig.title,
                info: me._legendInfo
            });

            me.legend.startup();
        };

        /* 绘制方法 */
        //绘制范围值
        DrawUtil.prototype.drawRange = function (me, callback) {
            var obj = this;
            var baseTag = me.config.layer.baseTag;
            var styleConfig = me.config.style;
            //创建渲染
            smartMapping.createClassedColorRenderer({
                layer: me.drawLayer,
                field: baseTag,
                basemap: 'topo',
                classificationMethod: styleConfig.classicMethod,
                numClasses: 5
            }).then(function (response) {
                var renderer = new ClassBreaksRenderer(null, baseTag);
                var colors = ColorUtil.getGradientColor('#ddd', styleConfig.baseColor, response.classBreakInfos.length + 1);
                me._classBreakInfos = response.classBreakInfos;
                var legendItems = [];
                response.classBreakInfos.forEach(function (v, i) {
                    //构造图例
                    legendItems.push({
                        color: colors[i + 1],
                        value: v.minValue + '-' + v.maxValue
                    });

                    var symbol = new SimpleFillSymbol();
                    symbol.setColor(new Color(colors[i + 1]));
                    symbol.setOutline(new SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new Color([75, 75, 75, 0.8]), 1));
                    renderer.addBreak(v.minValue, v.maxValue, symbol);
                });
                me._legendInfo.push(legendItems);
                me.drawLayer.setRenderer(renderer);
                callback && callback();
            });
        };
        //绘制唯一值
        DrawUtil.prototype.drawUnique = function (me, callback) {
            var obj = this;
            var styleConfig = me.config.style;
            //创建渲染
            smartMapping.createTypeRenderer({
                layer: me.drawLayer,
                field: diffField,
                basemap: 'streets',
                numTypes: -1
            }).then(function (response) {
                me.drawLayer.setRenderer(response.renderer);
                callback && callback();
            });
        };
        //绘制柱状图
        DrawUtil.prototype.drawHistogram = function (me) {
            var obj = this;
            var layerConfig = me.config.layer;
            var chartHeight = (me._features[0]._extent.ymax - me._features[0]._extent.ymin) / 3 * 2;
            var chartWidth = chartHeight / 5;
            var maxStatValue = getMaxValue();
            var colors = ColorUtil.getGradientColor(me.config.style.statColor, '#ddd', layerConfig.statTag.length + 1).slice(0, layerConfig.statTag.length);
            me._features.forEach(function (feature) {
                for (var i = 0; i < layerConfig.statTag.length; i++) {
                    var geometry = feature.geometry;
                    var center = geometry.getCentroid();
                    var xStart = center.x - (chartWidth * layerConfig.statTag.length) / 2;
                    var yStart = center.y;
                    var x = xStart + i * (chartWidth);
                    var xEnd = xStart + (i + 1) * (chartWidth);
                    var statData = feature.attributes[layerConfig.statTag[i]];
                    var yEnd = center.y + chartHeight * statData / maxStatValue;
                    var extent = new Extent(x, yStart, xEnd, yEnd, feature.spatialReference);
                    var symbol = new SimpleFillSymbol().setColor(colors[i]);
                    symbol.setOutline(new SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new Color([75, 75, 75, 0.5]), 0.5));
                    me.drawLayer.add(new Graphic(extent, symbol));
                }
            });
            saveLegend();

            //获取最大值
            function getMaxValue() {
                var data = [];
                me._features.forEach(function (feature) {
                    for (var i = 0; i < layerConfig.statTag.length; i++) {
                        data.push(feature.attributes[layerConfig.statTag[i]]);
                    }
                });
                data.sort(function (a, b) {
                    return a - b
                });
                return data[data.length - 1];
            }

            //存储图例信息
            function saveLegend() {
                var legendItems = [];
                layerConfig.statTag.forEach(function (tag, i) {
                    legendItems.push({
                        color: colors[i],
                        value: tag
                    })
                });
                me._legendInfo.push(legendItems);
            }
        };
        //绘制饼状图
        DrawUtil.prototype.drawPie = function (me) {
            var obj = this;
            var layerConfig = me.config.layer;
            var chartWidth = 0.015;
            var colors = ColorUtil.getGradientColor(me.config.style.statColor, '#ddd', layerConfig.statTag.length + 1).slice(0, layerConfig.statTag.length);
            me._features.forEach(function (feature) {
                var geometry = feature.geometry;
                var center = geometry.getCentroid();
                var totalValue = 0, startDegree = 0, endDegree = 0;
                //计算总和
                layerConfig.statTag.forEach(function (tag) {
                    totalValue += feature.attributes[tag];
                });
                layerConfig.statTag.forEach(function (tag, i) {
                    var curValue = feature.attributes[tag];
                    endDegree = startDegree + Math.PI * 2 * curValue / totalValue;
                    var rings = [];
                    var symbol = new SimpleFillSymbol().setColor(colors[i]);
                    symbol.setOutline(new SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new Color([60, 60, 60, 0.6]), 1));

                    rings.push([center.x, center.y]);
                    getRings(center, rings, startDegree, endDegree);
                    rings.push([center.x, center.y]);
                    var polygon = new Polygon(rings);
                    me.drawLayer.add(new Graphic(polygon, symbol));
                    startDegree = endDegree;
                });
            });
            saveLegend();

            //存储图例信息
            function saveLegend() {
                var legendItems = [];
                layerConfig.statTag.forEach(function (tag, i) {
                    legendItems.push({
                        color: colors[i],
                        value: tag
                    })
                });
                me._legendInfo.push(legendItems);
            }

            function getRingsForHalf(center, rings, startDegree, endDegree) {
                var maxDecimal = 0.000001;
                var num = 50;
                var centerX = center.x;
                var centerY = center.y;
                var r = (me._features[0]._extent.ymax - me._features[0]._extent.ymin) / 4;

                if (startDegree < Math.PI / 2 && endDegree <= Math.PI / 2) {
                    var xSizeBegin = centerX + Math.cos(endDegree) * r;
                    var xSizeEnd = centerX + Math.cos(startDegree) * r;
                    var xSize = xSizeEnd - xSizeBegin;
                    for (var i = num - 1; i >= 0; --i) {
                        var x = xSizeBegin + xSize * (i * 1.0 / (num - 1));
                        var square = r * r - (x - centerX) * (x - centerX);
                        var y = centerY + Math.sqrt(square < 0.0 ? 0.0 : square);
                        rings[rings.length] = [x, y];
                    }
                }
                else if (startDegree >= Math.PI / 2 && endDegree <= Math.PI) {
                    var xSizeBegin = centerX + Math.cos(endDegree) * r;
                    var xSizeEnd = centerX + Math.cos(startDegree) * r;
                    var xSize = xSizeEnd - xSizeBegin;
                    for (var i = num - 1; i >= 0; --i) {
                        var x = xSizeBegin + xSize * (i * 1.0 / (num - 1));
                        var square = r * r - (x - centerX) * (x - centerX);
                        var y = centerY + Math.sqrt(square < 0.0 ? 0.0 : square);
                        rings[rings.length] = [x, y];
                    }
                }
                else if (startDegree >= Math.PI && endDegree <= Math.PI * 3 / 2) {
                    var xSizeBegin = centerX + Math.cos(endDegree) * r;
                    var xSizeEnd = centerX + Math.cos(startDegree) * r;
                    var xSize = xSizeEnd - xSizeBegin;
                    for (var i = num - 1; i >= 0; --i) {
                        var x = xSizeBegin + xSize * (i * 1.0 / (num - 1));
                        var square = r * r - (x - centerX) * (x - centerX);
                        var y = centerY - Math.sqrt(square < 0.0 ? 0.0 : square);
                        rings[rings.length] = [x, y];
                    }
                }
                else if (startDegree >= (Math.PI * 3 / 2 - maxDecimal) && endDegree <= (Math.PI * 2 + maxDecimal)) {
                    var xSizeBegin = centerX + Math.cos(endDegree) * r;
                    var xSizeEnd = centerX + Math.cos(startDegree) * r;
                    var xSize = xSizeEnd - xSizeBegin;
                    for (var i = num - 1; i >= 0; --i) {
                        var x = xSizeBegin + xSize * (i * 1.0 / (num - 1));
                        var square = r * r - (x - centerX) * (x - centerX);
                        var y = centerY - Math.sqrt(square < 0.0 ? 0.0 : square);
                        rings[rings.length] = [x, y];
                    }
                }

            }

            function getRings(center, rings, startDegree, endDegree) {
                if (startDegree < Math.PI / 2 && endDegree > Math.PI / 2 && endDegree <= Math.PI) {
                    getRingsForHalf(center, rings, startDegree, Math.PI / 2);
                    getRingsForHalf(center, rings, Math.PI / 2, endDegree);
                }
                else if (startDegree < Math.PI / 2 && endDegree > Math.PI && endDegree <= Math.PI * 3 / 2) {
                    getRingsForHalf(center, rings, startDegree, Math.PI / 2);
                    getRingsForHalf(center, rings, Math.PI / 2, Math.PI);
                    getRingsForHalf(center, rings, Math.PI, endDegree);

                }
                else if (startDegree < Math.PI / 2 && endDegree > Math.PI * 3 / 2 && endDegree <= Math.PI * 2) {
                    getRingsForHalf(center, rings, startDegree, Math.PI / 2);
                    getRingsForHalf(center, rings, Math.PI / 2, Math.PI);
                    getRingsForHalf(center, rings, Math.PI, Math.PI * 3 / 2);
                    getRingsForHalf(center, rings, Math.PI * 3 / 2, endDegree);

                }
                else if (startDegree >= Math.PI / 2 && startDegree < Math.PI && endDegree > Math.PI && endDegree <= Math.PI * 3 / 2) {
                    getRingsForHalf(center, rings, startDegree, Math.PI);
                    getRingsForHalf(center, rings, Math.PI, endDegree);
                }
                else if (startDegree >= Math.PI / 2 && startDegree < Math.PI && endDegree > Math.PI * 3 / 2) {
                    getRingsForHalf(center, rings, startDegree, Math.PI);
                    getRingsForHalf(center, rings, Math.PI, Math.PI * 3 / 2);
                    getRingsForHalf(center, rings, Math.PI * 3 / 2, endDegree);
                }
                else if (startDegree >= Math.PI && startDegree < Math.PI * 3 / 2 && endDegree > Math.PI * 3 / 2) {
                    getRingsForHalf(center, rings, startDegree, Math.PI * 3 / 2);
                    getRingsForHalf(center, rings, Math.PI * 3 / 2, endDegree);
                } else {
                    getRingsForHalf(center, rings, startDegree, endDegree);
                }
            }
        };
        //绘制热力图
        DrawUtil.prototype.drawHeat = function (me) {
            var obj = this;
            debugger;
            var colorStops = Array.prototype.slice.call(me.config.style.colorStops, 0);
            var heatmapRenderer = new HeatmapRenderer({
                colorStops: colorStops,
                blurRadius: me.config.style.heatPower,
                maxPixelIntensity: 150,
                minPixelIntensity: 0
            });
            me.drawLayer.setRenderer(heatmapRenderer);
        };

        /* 辅助方法 */
        //获取对应统计数据
        DrawUtil.prototype.getCorData = function (statData, feature, corString, dataTag) {
            for (var i = 0; i < statData.length; i++) {
                var checked = 0;
                corString.forEach(function (item) {
                    var fd = item.substring(0, item.indexOf('='));
                    var value = item.substring(item.indexOf('=') + 1);
                    if (fd.indexOf('&') < 0) {
                        if (statData[i][fd] == feature.attributes[value])
                            checked++;
                    }
                    else {
                        fd = fd.substring(1);
                        if (statData[i][fd] == value)
                            checked++;
                    }
                });
                if (checked == corString.length && checked != 0) {
                    return parseFloat(statData[i][dataTag]);
                }
            }
            return false;
        };

        return new DrawUtil();
    })
;


