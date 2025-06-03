(() => {
  try {
    const data = localStorage.getItem("citations");

    console.log("data",data)
    const citations = data ? JSON.parse(data) : [];

    console.log("read local stotage citations", citations)

    // Send to content script via window.postMessage
    window.postMessage({ type: "LOCAL_CITATIONS", citations }, "*");
  } catch (err) {
    console.error("Failed to read localStorage:", err);
  }
})();
