document.addEventListener("DOMContentLoaded", function () {
    const statusDot = document.getElementById("connection-status");
    const statusText = document.getElementById("status-text");
    const liveFeed = document.getElementById("live-feed");

    // Create the WebSocket
    const socket = new WebSocket("ws://localhost:8005/ws/kafka");

    socket.onopen = () => {
        if (statusDot) statusDot.style.backgroundColor = "green";
        if (statusText) statusText.textContent = "Connected";
        console.log("WebSocket connected");
    };

    socket.onclose = () => {
        if (statusDot) statusDot.style.backgroundColor = "red";
        if (statusText) statusText.textContent = "Disconnected";
        console.log("WebSocket disconnected");
    };

    socket.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    if (liveFeed) {
        socket.onmessage = (event) => {
            console.log("Message reçu :", event.data);
            try {
                const data = JSON.parse(event.data);

                // Determine sentiment
                let sentimentClass, sentimentText;
                if (data.prediction === 2 || data.prediction === "2") {
                    sentimentClass = "positive";
                    sentimentText = "Positive";
                } else if (data.prediction === 1 || data.prediction === "1") {
                    sentimentClass = "negative";
                    sentimentText = "Negative";
                } else if (data.prediction === 0 || data.prediction === "0") {
                    sentimentClass = "neutral";
                    sentimentText = "Neutral";
                } else {
                    sentimentClass = "neutral";
                    sentimentText = "Unknown";
                }

                // Create the review item
                const item = document.createElement("div");
                item.className = "review-item " + sentimentClass;
                item.innerHTML = `
                    <div class="review-header">
                        <span class="review-product">${data.asin || "N/A"}</span>
                        <span class="review-time">${data.reviewTime || ""}</span>
                    </div>
                    <div class="review-text">${data.reviewText || ""}</div>
                    <div class="reviewer">by ${data.reviewerName || "Anonymous"}</div>
                    <span class="sentiment-tag ${sentimentClass}">
                        ${sentimentText}
                    </span>
                `;
                liveFeed.prepend(item);

                if (liveFeed.children.length > 50) {
                    liveFeed.removeChild(liveFeed.lastChild);
                }
            } catch (e) {
                console.error("Invalid JSON or missing fields:", e);
            }
        };
    }
});