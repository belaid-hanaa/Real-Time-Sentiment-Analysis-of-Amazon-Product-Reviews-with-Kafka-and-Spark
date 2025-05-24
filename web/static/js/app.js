document.addEventListener('DOMContentLoaded', function() {
    async function fetchAndShowStats() {
        try {
            const res = await fetch("/reviews");
            const reviews = await res.json();

            // Calculate statistics
            const total = reviews.length;
            const positive = reviews.filter(r => r.prediction === 2 || r.prediction === "2").length;
            const negative = reviews.filter(r => r.prediction === 1 || r.prediction === "1").length;
            const neutral = reviews.filter(r => r.prediction === 0 || r.prediction === "0").length;

            // Update stat cards
            document.getElementById("total-reviews").textContent = total;
            document.getElementById("positive-reviews").textContent = positive;
            document.getElementById("neutral-reviews").textContent = neutral;
            document.getElementById("negative-reviews").textContent = negative;
            
            // Create distribution chart
            createDistributionChart(positive, neutral, negative);
            
            // Create timeline chart
            createTimelineChart(reviews);
            
            // Populate recent reviews table
            populateReviewsTable(reviews);

        } catch (e) {
            console.error("Failed to fetch stats:", e);
        }
    }
    
    // Create sentiment distribution chart
    function createDistributionChart(positive, neutral, negative) {
        const ctx = document.getElementById("distributionChart").getContext("2d");

        if (window.distributionChart && typeof window.distributionChart.destroy === "function") {
            window.distributionChart.destroy();
        }

        window.distributionChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Positive", "Neutral", "Negative"],
                datasets: [{
                    data: [positive, neutral, negative],
                    backgroundColor: ["#36e2b4", "#ff9c47", "#ff4757"],
                    borderColor: ["rgba(54, 226, 180, 0.7)", "rgba(255, 156, 71, 0.7)", "rgba(255, 71, 87, 0.7)"],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            color: '#a0a3b8',
                            font: {
                                family: 'Poppins',
                                size: 13
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 28, 54, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#a0a3b8',
                        borderColor: 'rgba(107, 71, 237, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                const label = context.label;
                                const value = context.raw;
                                const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Create enhanced timeline chart
    
    function createTimelineChart(reviews) {
        // Prepare data: count sentiments per day
        const timeMap = {};
        reviews.forEach(r => {
            const date = r.reviewTime ? r.reviewTime.split(',')[0].trim() : "Unknown";
            if (!timeMap[date]) timeMap[date] = { positive: 0, negative: 0, neutral: 0 };
            if (r.prediction === 2 || r.prediction === "2") timeMap[date].positive += 1;
            else if (r.prediction === 1 || r.prediction === "1") timeMap[date].negative += 1;
            else if (r.prediction === 0 || r.prediction === "0") timeMap[date].neutral += 1;
        });
        const dates = Object.keys(timeMap).sort((a, b) => new Date(a) - new Date(b));
        const posData = dates.map(d => timeMap[d].positive);
        const negData = dates.map(d => timeMap[d].negative);
        const neuData = dates.map(d => timeMap[d].neutral);

        const ctx = document.getElementById("timelineChart").getContext("2d");

        // Only destroy if it's a Chart instance
        if (window.timelineChart && typeof window.timelineChart.destroy === "function") {
            window.timelineChart.destroy();
        }

        window.timelineChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: dates,
                datasets: [
                    {
                        label: "Positive",
                        data: posData,
                        borderColor: "#36e2b4",
                        backgroundColor: "rgba(54,226,180,0.1)",
                        fill: true,
                        tension: 0.2
                    },
                    {
                        label: "Negative",
                        data: negData,
                        borderColor: "#ff4757",
                        backgroundColor: "rgba(255,71,87,0.1)",
                        fill: true,
                        tension: 0.2
                    },
                    {
                        label: "Neutral",
                        data: neuData,
                        borderColor: "#ff9c47",
                        backgroundColor: "rgba(255,156,71,0.1)",
                        fill: true,
                        tension: 0.2
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom" }
                },
                scales: {
                    x: { title: { display: true, text: "Date" } },
                    y: { beginAtZero: true }
                }
            }
        });
    }


    
    // Handle time range button clicks
    function setupTimeRangeButtons() {
        const buttons = document.querySelectorAll('.time-range .btn-sm');
        if (!buttons.length) return;
        
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                // Update active state
                buttons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                const range = this.getAttribute('data-range');
                updateTimeRange(range);
            });
        });
    }
    
    function updateTimeRange(range) {
        // This would update the chart's time range with filtered data
        console.log(`Changing time range to ${range}`);
        
        // In a real implementation, you would filter data for the selected time range
        // and update the chart accordingly
    }
    
    // Populate reviews table with data
    function populateReviewsTable(reviews) {
        const tbody = document.getElementById('reviews-body');
        if (!tbody) return;
        
        // Clear existing rows
        tbody.innerHTML = '';
        
        // Sort and get most recent reviews
        const recentReviews = reviews
            .filter(r => r.reviewText)
            .sort((a, b) => new Date(b.reviewTime || 0) - new Date(a.reviewTime || 0))
            .slice(0, 10);
            
        // Add rows to table
        recentReviews.forEach(review => {
            // Determine sentiment class and text
            let sentimentClass, sentimentText;
            if (review.prediction === 2 || review.prediction === "2") {
                sentimentClass = "positive";
                sentimentText = "Positive";
            } else if (review.prediction === 1 || review.prediction === "1") {
                sentimentClass = "negative";
                sentimentText = "Negative";
            } else if (review.prediction === 0 || review.prediction === "0") {
                sentimentClass = "neutral";
                sentimentText = "Neutral";
            } else {
                sentimentClass = "neutral";
                sentimentText = "Unknown";
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${review.reviewTime || "N/A"}</td>
                <td>${review.asin || "N/A"}</td>
                <td>${review.reviewText ? review.reviewText.substring(0, 100) + (review.reviewText.length > 100 ? '...' : '') : "N/A"}</td>
                <td><span class="sentiment-tag ${sentimentClass}">${sentimentText}</span></td>
                <td>${review.score ? review.score.toFixed(2) : "N/A"}</td>
            `;
            
            tbody.appendChild(row);
        });

        const refreshButton = document.getElementById('refresh-btn');
        if (refreshButton) {
            refreshButton.addEventListener('click', fetchAndShowStats);
        }
    }

    // Initialize dashboard
    fetchAndShowStats();
});