let distributionChart, timelineChart;
let allReviews = [];
let websocket;

function connectWebSocket() {
    document.getElementById('connection-status').classList.remove('connected');
    document.getElementById('status-text').textContent = 'Connecting...';

    websocket = new WebSocket(`ws://localhost:8001/ws/kafka`);

    websocket.onopen = function () {
        document.getElementById('connection-status').classList.add('connected');
        document.getElementById('status-text').textContent = 'Connected';
        console.log('WebSocket connection established');
    };

    websocket.onmessage = function (event) {
        const data = JSON.parse(event.data);
        processNewReview(data);
    };

    websocket.onclose = function () {
        document.getElementById('connection-status').classList.remove('connected');
        document.getElementById('status-text').textContent = 'Disconnected';
        console.log('WebSocket connection closed. Reconnecting in 3s...');
        setTimeout(connectWebSocket, 3000);
    };

    websocket.onerror = function (error) {
        console.error('WebSocket error:', error);
        websocket.close();
    };
}

function processNewReview(review) {
    allReviews.unshift(review);

    updateStats();
    updateReviewList();
    updateCharts();
}

function updateStats() {
    const total = allReviews.length;
    const positives = allReviews.filter(r => r.sentiment === 'positive').length;
    const negatives = allReviews.filter(r => r.sentiment === 'negative').length;
    const average = (positives - negatives) / total;

    document.getElementById('total-reviews').textContent = total;
    document.getElementById('positive-count').textContent = positives;
    document.getElementById('negative-count').textContent = negatives;
    document.getElementById('avg-sentiment').textContent = average.toFixed(2);
}

function updateReviewList() {
    const list = document.getElementById('review-list');
    list.innerHTML = "";

    allReviews.slice(0, 10).forEach(review => {
        const div = document.createElement('div');
        div.className = `review-item ${review.sentiment}`;
        div.innerHTML = `
            <div class="review-header">
                <div class="review-product">${review.product}</div>
                <div class="review-time">${new Date(review.timestamp).toLocaleString()}</div>
            </div>
            <div class="review-text">${review.text}</div>
            <div>
                <span class="sentiment-tag ${review.sentiment}">${review.sentiment}</span>
                <span class="sentiment-score">${review.score.toFixed(2)}</span>
            </div>`;
        list.appendChild(div);
    });
}

function initCharts() {
    const distributionCtx = document.getElementById('distribution-chart').getContext('2d');
    const timelineCtx = document.getElementById('timeline-chart').getContext('2d');

    distributionChart = new Chart(distributionCtx, {
        type: 'doughnut',
        data: {
            labels: ['Positive', 'Negative', 'Neutral'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#2ecc71', '#e74c3c', '#3498db']
            }]
        },
        options: {
            responsive: true
        }
    });

    timelineChart = new Chart(timelineCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Average Sentiment',
                borderColor: '#febd69',
                data: [],
                fill: false
            }]
        },
        options: {
            responsive: true
        }
    });
}

function updateCharts() {
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const sentimentTimeline = [];

    allReviews.forEach((review, index) => {
        sentimentCounts[review.sentiment]++;
        const avg = (allReviews.slice(0, index + 1).filter(r => r.sentiment === 'positive').length -
            allReviews.slice(0, index + 1).filter(r => r.sentiment === 'negative').length) /
            (index + 1);
        sentimentTimeline.push(avg.toFixed(2));
    });

    distributionChart.data.datasets[0].data = [
        sentimentCounts.positive,
        sentimentCounts.negative,
        sentimentCounts.neutral
    ];
    distributionChart.update();

    timelineChart.data.labels = allReviews.map(r => new Date(r.timestamp).toLocaleTimeString()).slice(0, 20);
    timelineChart.data.datasets[0].data = sentimentTimeline.slice(0, 20);
    timelineChart.update();
}

document.addEventListener("DOMContentLoaded", () => {
    initCharts();
    connectWebSocket();
});
