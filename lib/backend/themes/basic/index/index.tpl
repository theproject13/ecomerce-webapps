{use class="common\helpers\Acl"}
<div class="dash-v2">

    <div class="period-tabs anim d1" id="periodTabs">
        <div class="period-tab" data-period="today">Today</div>
        <div class="period-tab" data-period="week">This Week</div>
        <div class="period-tab active" data-period="month">This Month</div>
        <div class="period-tab" data-period="year">This Year</div>
        <div class="period-tab" data-period="all">Lifetime</div>
    </div>

    <div class="summary-grid">
        <div class="summary-card card-purple anim d1">
            <div class="summary-card-header">
                <div class="summary-card-icon icon-purple"><i class="fas fa-users"></i></div>
                <div class="summary-card-trend trend-up"><i class="fas fa-arrow-up"></i> {$dash.customersGrowth}</div>
            </div>
            <div class="summary-card-label">Total Customers</div>
            <div class="summary-card-value" id="valCustomers">{$dash.month.customers}</div>
            <div class="summary-card-sub" id="subCustomers">{$dash.month.cSub}</div>
        </div>

        <div class="summary-card card-orange anim d2">
            <div class="summary-card-header">
                <div class="summary-card-icon icon-orange"><i class="fas fa-clock"></i></div>
            </div>
            <div class="summary-card-label">Unfulfilled Orders</div>
            <div class="summary-card-value" id="valUnfulfilled">{$dash.month.unfulfilled}</div>
            <div class="summary-card-sub" id="subUnfulfilled">{$dash.month.uSub}</div>
        </div>

        <div class="summary-card card-cyan anim d3">
            <div class="summary-card-header">
                <div class="summary-card-icon icon-cyan"><i class="fas fa-receipt"></i></div>
            </div>
            <div class="summary-card-label">Avg. Order Value</div>
            <div class="summary-card-value" id="valAvgOrder">{$dash.month.avg}</div>
            <div class="summary-card-sub" id="subAvgOrder">{$dash.month.aSub}</div>
        </div>

        <div class="summary-card card-green anim d4">
            <div class="summary-card-header">
                <div class="summary-card-icon icon-green"><i class="fas fa-coins"></i></div>
            </div>
            <div class="summary-card-label">Total Revenue</div>
            <div class="summary-card-value" id="valRevenue">{$dash.month.revenue}</div>
            <div class="summary-card-sub" id="subRevenue">{$dash.month.rSub}</div>
        </div>
    </div>

    <div class="chart-section">
        <div class="chart-card anim d4">
            <div class="chart-card-header">
                <div>
                    <div class="chart-card-title">Sales Overview</div>
                    <div class="chart-card-subtitle">Last 12 months performance</div>
                </div>
                <div class="chart-legend">
                    <div class="legend-item"><div class="legend-dot" style="background:var(--v2-accent);"></div> Revenue</div>
                    <div class="legend-item"><div class="legend-dot" style="background:var(--v2-cyan);"></div> Orders</div>
                    <div class="legend-item"><div class="legend-dot" style="background:var(--v2-orange);"></div> Avg. Value</div>
                </div>
            </div>
            <div class="chart-canvas-wrap">
                <canvas id="mainChart"></canvas>
            </div>
        </div>

        <div class="chart-card anim d5">
            <div class="recent-header">
                <h3>Recent Orders</h3>
                <a class="view-all-btn" href="{$app->urlManager->createUrl('orders')}">View All &rarr;</a>
            </div>
            <div id="recentOrders"></div>
        </div>
    </div>

</div>

<script type="text/javascript">
    window.DASH_DATA = {$dashJson nofilter};
</script>
<script type="text/javascript">{literal}
(function () {
    var D = window.DASH_DATA || {};
    var monthLabels = D.labels || ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var chartData = D.chart || { revenue: [], orders: [], avgValue: [] };
    var periods = D.periods || {};
    var symL = D.symLeft || '';
    var symR = D.symRight || '';
    var isDark = document.documentElement.classList.contains('themeDark');
    var gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.08)';
    var axisColor = isDark ? 'rgba(240,240,245,0.25)' : 'rgba(15,23,42,0.45)';
    var xLabelColor = isDark ? 'rgba(240,240,245,0.3)' : 'rgba(15,23,42,0.5)';

    function fmt(v) {
        return symL + Number(v).toLocaleString() + symR;
    }

    /* ===== PERIOD TABS ===== */
    function switchPeriod(el) {
        var tabs = document.querySelectorAll('.dash-v2 .period-tab');
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
        el.classList.add('active');
        var d = periods[el.getAttribute('data-period')];
        if (!d) return;
        animateValue('valCustomers', d.customers);
        animateValue('valUnfulfilled', d.unfulfilled);
        animateValue('valAvgOrder', d.avg);
        animateValue('valRevenue', d.revenue);
        setText('subCustomers', d.cSub);
        setText('subUnfulfilled', d.uSub);
        setText('subAvgOrder', d.aSub);
        setText('subRevenue', d.rSub);
    }

    function setText(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    function animateValue(id, newVal) {
        var el = document.getElementById(id);
        if (!el) return;
        el.style.transition = 'opacity 0.15s';
        el.style.opacity = '0.3';
        setTimeout(function () { el.textContent = newVal; el.style.opacity = '1'; }, 150);
    }

    /* ===== RECENT ORDERS ===== */
    function renderOrders() {
        var wrap = document.getElementById('recentOrders');
        if (!wrap) return;
        var list = D.orders || [];
        wrap.innerHTML = list.map(function (o) {
            var cls = o.status === 'complete' ? 'status-complete'
                : o.status === 'cancelled' ? 'status-cancelled' : 'status-pending';
            return '<a class="order-item" href="' + (o.link || '#') + '" style="text-decoration:none;color:inherit;">' +
                '<div class="order-thumb"><i class="fas ' + (o.icon || 'fa-shopping-bag') + '"></i></div>' +
                '<div class="order-info"><h4>' + o.customer + '</h4><p>#' + o.id + ' &middot; ' + o.statusLabel + '</p></div>' +
                '<div class="order-amount">' + o.amount + '</div>' +
                '<span class="order-status ' + cls + '">' + o.statusLabel + '</span></a>';
        }).join('');
    }

    /* ===== CHART ===== */
    function drawChart() {
        var canvas = document.getElementById('mainChart');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.parentElement.getBoundingClientRect();
        if (!rect.width) return;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var W = rect.width, H = rect.height;
        var padL = 54, padR = 20, padT = 10, padB = 36;
        var cW = W - padL - padR, cH = H - padT - padB;
        ctx.clearRect(0, 0, W, H);

        var rev = chartData.revenue || [], ord = chartData.orders || [], avg = chartData.avgValue || [];
        if (!rev.length) return;

        var gridLines = 5;
        var maxRev = Math.max.apply(null, rev.concat([1])) * 1.15;
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        ctx.font = '10px Inter';
        for (var i = 0; i <= gridLines; i++) {
            var y = padT + (cH / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(padL + cW, y);
            ctx.stroke();
            var val = maxRev - (maxRev / gridLines) * i;
            ctx.fillStyle = axisColor;
            ctx.textAlign = 'right';
            ctx.fillText(symL + Math.round(val), padL - 8, y + 4);
        }

        var stepX = cW / (monthLabels.length - 1);
        ctx.textAlign = 'center';
        monthLabels.forEach(function (lbl, idx) {
            ctx.fillStyle = xLabelColor;
            ctx.fillText(lbl, padL + stepX * idx, H - 10);
        });

        function smooth(data, maxVal, color, lw, fill) {
            var pts = data.map(function (v, i) {
                return { x: padL + stepX * i, y: padT + cH - (v / maxVal) * cH };
            });
            if (fill) {
                var grad = ctx.createLinearGradient(0, padT, 0, padT + cH);
                grad.addColorStop(0, fill);
                grad.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.moveTo(pts[0].x, padT + cH);
                ctx.lineTo(pts[0].x, pts[0].y);
                for (var i = 1; i < pts.length; i++) {
                    var c1x = (pts[i - 1].x + pts[i].x) / 2, c1y = pts[i - 1].y;
                    var c2x = (pts[i - 1].x + pts[i].x) / 2, c2y = pts[i].y;
                    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, pts[i].x, pts[i].y);
                }
                ctx.lineTo(pts[pts.length - 1].x, padT + cH);
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.fill();
            }
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (var j = 1; j < pts.length; j++) {
                var a1x = (pts[j - 1].x + pts[j].x) / 2, a1y = pts[j - 1].y;
                var a2x = (pts[j - 1].x + pts[j].x) / 2, a2y = pts[j].y;
                ctx.bezierCurveTo(a1x, a1y, a2x, a2y, pts[j].x, pts[j].y);
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = lw;
            ctx.stroke();
            var last = pts[pts.length - 1];
            ctx.beginPath();
            ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }

        var maxOrd = Math.max.apply(null, ord.concat([1])) * 1.3;
        var barW = Math.max(6, stepX * 0.25);
        ord.forEach(function (v, i) {
            var x = padL + stepX * i - barW / 2;
            var barH = (v / maxOrd) * cH;
            var y = padT + cH - barH;
            var grad = ctx.createLinearGradient(0, y, 0, padT + cH);
            grad.addColorStop(0, 'rgba(34,211,238,0.25)');
            grad.addColorStop(1, 'rgba(34,211,238,0.03)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            if (ctx.roundRect) { ctx.roundRect(x, y, barW, barH, 3); } else { ctx.rect(x, y, barW, barH); }
            ctx.fill();
        });

        smooth(rev, maxRev, '#42b549', 2.5, 'rgba(66,181,73,0.12)');
        smooth(avg, maxRev, '#fbbf24', 1.5, null);
    }

    function init() {
        var tabs = document.querySelectorAll('.dash-v2 .period-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function () { switchPeriod(this); });
        }
        renderOrders();
        drawChart();
        var rt;
        window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawChart, 120); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
{/literal}</script>
