/* ==========================================================================
   SAVI Corporate Website - Trace Visualizer (Figure -> Formula -> Query -> Rows -> Source record)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const traceNodes = document.querySelectorAll('.trace-node');
  const traceDetailBox = document.getElementById('trace-detail-content');

  const traceDetails = {
    'figure': {
      title: 'Figure (Computed Output)',
      code: 'EBITDA (Q2 2026): ₹ 42,850,000',
      desc: 'The reported metric is displayed clearly. Clicking the figure opens the exact formula and lineage used to generate it.'
    },
    'formula': {
      title: 'Formula (Deterministic Logic)',
      code: 'EBITDA = Gross Operating Income - (Operating Expenses - Depreciation - Amortisation)',
      desc: 'The calculation rule is deterministic and audited. The AI model explains the result; it never generates the mathematical formula or values.'
    },
    'query': {
      title: 'Query (Executed Ledger Search)',
      code: 'FETCH general_ledger WHERE period = "2026-Q2" AND status = "posted" GROUP BY cost_center',
      desc: 'SAVI executes structured queries directly against your validated underlying ledger records.'
    },
    'rows': {
      title: 'Rows (Filtered Transaction Dataset)',
      code: 'Matched 1,482 individual ledger entries across 3 legal entities',
      desc: 'Every row included in the computation is isolated, verified for double-entry balance, and listed in full.'
    },
    'source': {
      title: 'Source Record (Original Artifact)',
      code: 'Invoice #INV-2026-88912 | Subsidiary: Vinayaka Ops Tech Ltd | File Ref: Doc_9921.pdf',
      desc: 'The lineage ends at the physical originating record, invoice, or voucher inside your system of record.'
    }
  };

  if (traceNodes.length > 0) {
    traceNodes.forEach(node => {
      node.addEventListener('click', () => {
        traceNodes.forEach(n => n.classList.remove('active'));
        node.classList.add('active');

        const key = node.getAttribute('data-trace-step');
        if (traceDetailBox && traceDetails[key]) {
          const detail = traceDetails[key];
          traceDetailBox.innerHTML = `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-dark); border-radius: 6px; padding: 20px; text-align: left;">
              <h4 style="color: var(--gold-primary); font-size: 1.125rem; margin-bottom: 8px;">${detail.title}</h4>
              <p style="font-family: monospace; font-size: 0.9375rem; background: #071526; padding: 10px 14px; border-radius: 4px; color: #DBB46F; margin-bottom: 12px;">${detail.code}</p>
              <p style="font-size: 0.9375rem; color: #E2E8F0; margin: 0;">${detail.desc}</p>
            </div>
          `;
        }
      });
    });
  }
});
