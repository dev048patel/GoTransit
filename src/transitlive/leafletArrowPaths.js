L.ArrowPath = L.Polyline.extend({
    test: function () {
        console.log("Arrow!");
    }, _update: function () {
        if (this._map) {
            this._clipPoints();
            this._simplifyPoints();
            this._addArrows();
            this._updatePath()
        };
    }, _addArrows: function () {
        var previousPoint, currentPoint;
        for (var i = 0, n = this._parts.length; i < n; i++) {
            for (var j = 1; j < this._parts[i].length; j++) {
                previousPoint = L.point(this._parts[i][j - 1]);
                currentPoint = L.point(this._parts[i][j]);
                distanceBetween = previousPoint.distanceTo(currentPoint);
                if (distanceBetween <= 75) {
                    continue;
                }
                direction = currentPoint.subtract(previousPoint);
                unitDirection = direction.divideBy(distanceBetween);
                fortyFiveTrig = 0.70710678118;
                betaX = fortyFiveTrig * unitDirection.x;
                betaY = fortyFiveTrig * unitDirection.y;
                arrow = {
                    leftArm: L.point(- betaX - betaY, betaX - betaY)._multiplyBy(5),
                    rightArm: L.point(- betaX + betaY, - betaY - betaX)._multiplyBy(5)
                }
                numOfSteps = Math.ceil(distanceBetween / 50);
                step = direction.divideBy(numOfSteps);
                trackingPoint = previousPoint.clone();
                for (var k = 0; k + 1 < numOfSteps; k++) {
                    trackingPoint._add(step);
                    this._parts.push([
                        trackingPoint.add(arrow.leftArm),
                        trackingPoint.clone(),
                        trackingPoint.add(arrow.rightArm)
                    ]);
                }
            }
        }
    }
});
