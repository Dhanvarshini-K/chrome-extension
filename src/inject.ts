(() => {
  const OID = localStorage.getItem("OID");
  console.log("📌 OID:", OID);

  if (!OID) {
    console.error("❌ OID missing");
    return;
  }

  const storageKey = `citations_${OID}`;

  interface Citation {
    title: string;
    url: string;
  }

  const waitForCards = async (timeout = 5000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const cards = document.querySelectorAll(
        'a.gap-sm.flex.select-none.rounded-xl.font-sans'
      );
      if (cards.length) return cards;
      await new Promise((r) => setTimeout(r, 300));
    }
    return document.querySelectorAll(
      'a.gap-sm.flex.select-none.rounded-xl.font-sans'
    );
  };

  const run = async () => {
    const cards = await waitForCards();

    console.log("🔍 Citation cards found:", cards.length);

    const citations: Citation[] = [];

    cards.forEach((card) => {
      // Grab title from span with specific classes
      const titleEl = card.querySelector(
        'span.font-medium.text-super.line-clamp-1'
      ) as HTMLElement | null;

      // Grab URL from href of the <a> tag itself
      const url = (card as HTMLAnchorElement).href || "";

      const title = titleEl?.textContent?.trim() || "";

      if (title && url) {
        citations.push({ title, url });
      }
    });

    console.log("✅ Extracted citations:", citations);

    localStorage.setItem(storageKey, JSON.stringify(citations));

    window.postMessage(
      {
        type: "CITATIONS_FOUND",
        citations,
        OID,
      },
      "*"
    );
  };

  run();
})();
