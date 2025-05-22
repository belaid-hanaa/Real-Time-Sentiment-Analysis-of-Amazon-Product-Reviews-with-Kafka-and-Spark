if (document.getElementById("dashboard")) {
    async function fetchAndShowStats() {
        try {
            const res = await fetch("/reviews");
            const reviews = await res.json();

            const total = reviews.length;
            const positive = reviews.filter(r => r.prediction === 2 || r.prediction === "2").length;
            const negative = reviews.filter(r => r.prediction === 1 || r.prediction === "1").length;
            const neutral  = reviews.filter(r => r.prediction === 0 || r.prediction === "0").length;
            const avg = total > 0
                ? (reviews.reduce((sum, r) => sum + (typeof r.prediction === "number" ? r.prediction : parseFloat(r.prediction)), 0) / total).toFixed(2)
                : "0";

            document.getElementById("total-reviews").textContent = total;
            document.getElementById("positive-count").textContent = positive;
            document.getElementById("negative-count").textContent = negative;
            document.getElementById("neutral-count").textContent = neutral;
            document.getElementById("avg-sentiment").textContent = avg;

            // Sentiment Distribution Chart
            const ctxDist = document.getElementById("distribution-chart").getContext("2d");
            if (window.sentimentDistChart) window.sentimentDistChart.destroy();
            window.sentimentDistChart = new Chart(ctxDist, {
                type: "doughnut",
                data: {
                    labels: ["Positive", "Negative", "Neutral"],
                    datasets: [{
                        data: [positive, negative, neutral],
                        backgroundColor: ["#2ecc71", "#e74c3c", "#3498db"]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: "bottom" } }
                }
            });

            // Sentiment Over Time Chart
            const timeMap = {};
            reviews.forEach(r => {
                const date = r.reviewTime || "Unknown";
                if (!timeMap[date]) timeMap[date] = { positive: 0, negative: 0, neutral: 0 };
                if (r.prediction === 2 || r.prediction === "2") timeMap[date].positive += 1;
                else if (r.prediction === 1 || r.prediction === "1") timeMap[date].negative += 1;
                else if (r.prediction === 0 || r.prediction === "0") timeMap[date].neutral += 1;
            });
            const dates = Object.keys(timeMap).sort((a, b) => new Date(a) - new Date(b));
            const posData = dates.map(d => timeMap[d].positive);
            const negData = dates.map(d => timeMap[d].negative);
            const neuData = dates.map(d => timeMap[d].neutral);

            const ctxTime = document.getElementById("timeline-chart").getContext("2d");
            if (window.sentimentTimeChart) window.sentimentTimeChart.destroy();
            window.sentimentTimeChart = new Chart(ctxTime, {
                type: "line",
                data: {
                    labels: dates,
                    datasets: [
                        {
                            label: "Positive",
                            data: posData,
                            borderColor: "#2ecc71",
                            backgroundColor: "rgba(46,204,113,0.1)",
                            fill: true,
                        },
                        {
                            label: "Negative",
                            data: negData,
                            borderColor: "#e74c3c",
                            backgroundColor: "rgba(231,76,60,0.1)",
                            fill: true,
                        },
                        {
                            label: "Neutral",
                            data: neuData,
                            borderColor: "#3498db",
                            backgroundColor: "rgba(52,152,219,0.1)",
                            fill: true,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: "bottom" } },
                    scales: { x: { title: { display: true, text: "Date" } } }
                }
            });

            // Recent Reviews
            const reviewList = document.getElementById("review-list");
            if (reviewList) {
                reviewList.innerHTML = "";
                const sorted = reviews
                    .filter(r => r.reviewText)
                    .sort((a, b) => new Date(b.reviewTime) - new Date(a.reviewTime))
                    .slice(0, 10);

                sorted.forEach(r => {
                    let sentimentClass, sentimentText;
                    if (r.prediction === 2 || r.prediction === "2") {
                        sentimentClass = "positive";
                        sentimentText = "Positive";
                    } else if (r.prediction === 1 || r.prediction === "1") {
                        sentimentClass = "negative";
                        sentimentText = "Negative";
                    } else if (r.prediction === 0 || r.prediction === "0") {
                        sentimentClass = "neutral";
                        sentimentText = "Neutral";
                    } else {
                        sentimentClass = "neutral";
                        sentimentText = "Unknown";
                    }
                    const item = document.createElement("div");
                    item.className = "review-item " + sentimentClass;
                    item.innerHTML = `
                        <div class="review-header">
                            <span class="review-product">${r.asin || "N/A"}</span>
                            <span class="review-time">${r.reviewTime || ""}</span>
                        </div>
                        <div class="review-text">${r.reviewText || ""}</div>
                        <div class="reviewer">by ${r.reviewerName || "Anonymous"}</div>
                        <span class="sentiment-tag ${sentimentClass}">
                            ${sentimentText}
                        </span>
                    `;
                    reviewList.appendChild(item);
                });
            }

        } catch (e) {
            console.error("Failed to fetch stats:", e);
        }
    }

    fetchAndShowStats();
}