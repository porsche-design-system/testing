"use client";

import { useCallback, useState } from "react";
import {
  PButton,
  PButtonPure,
  PHeading,
  PSheet,
  PTable,
  PTableBody,
  PTableCell,
  PTableHead,
  PTableHeadCell,
  PTableHeadRow,
  PTableRow,
  type TableHeadCellSort,
  type TableUpdateEventDetail,
} from "@porsche-design-system/components-react/ssr";
import type { ProductSizeComparisonCopy } from "@/app/components/accessible/product/ProductSizeComparisonSheet";
import {
  type ApparelSizeChartRow,
  apparelSizeChart,
  apparelSizes,
} from "@/app/data/apparel-size-chart";

type Props = {
  copy: ProductSizeComparisonCopy;
};

const SIZE_SORT_ID = "size";

function compareBySize(
  a: ApparelSizeChartRow,
  b: ApparelSizeChartRow,
  direction: "asc" | "desc",
): number {
  const aIndex = apparelSizes.indexOf(a.size);
  const bIndex = apparelSizes.indexOf(b.size);
  return direction === "asc" ? aIndex - bIndex : bIndex - aIndex;
}

/**
 * Intentional PDS & WCAG defects:
 * - Trigger `PButtonPure` omits `aria-haspopup="dialog"`
 * - `PSheet` omits `aria={{ "aria-label": ... }}`
 * - `PTable` omits `caption` prop (PDS Don't: table without accessible name)
 * - Sheet heading uses `tag="h6"`
 */
export function ProductSizeComparisonSheet({ copy }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ApparelSizeChartRow[]>(() => [
    ...apparelSizeChart,
  ]);
  const [sizeSort, setSizeSort] = useState<TableHeadCellSort>({
    id: SIZE_SORT_ID,
    active: true,
    direction: "asc",
  });

  const onTableUpdate = useCallback(
    (event: CustomEvent<TableUpdateEventDetail>) => {
      const { id, direction = "asc" } = event.detail;
      if (id !== SIZE_SORT_ID) return;

      setSizeSort({ active: true, ...event.detail });
      setRows((prev) =>
        [...prev].sort((a, b) => compareBySize(a, b, direction)),
      );
    },
    [],
  );

  return (
    <>
      <PButtonPure
        data-testid="size-comparison-trigger"
        icon="information"
        onClick={() => setOpen(true)}
        type="button"
      >
        {copy.triggerLabel}
      </PButtonPure>

      <PSheet onDismiss={() => setOpen(false)} open={open}>
        <PHeading size="lg" slot="header" tag="h6">
          {copy.heading}
        </PHeading>

        <div className="grid gap-fluid-md">
          <PTable compact layout="fixed" onUpdate={onTableUpdate}>
            <PTableHead>
              <PTableHeadRow>
                <PTableHeadCell sort={sizeSort}>
                  {copy.columns.size}
                </PTableHeadCell>
                <PTableHeadCell>{copy.columns.eu}</PTableHeadCell>
                <PTableHeadCell>{copy.columns.us}</PTableHeadCell>
                <PTableHeadCell>{copy.columns.uk}</PTableHeadCell>
                <PTableHeadCell>{copy.columns.fr}</PTableHeadCell>
                <PTableHeadCell>{copy.columns.it}</PTableHeadCell>
              </PTableHeadRow>
            </PTableHead>
            <PTableBody>
              {rows.map((row) => (
                <PTableRow key={row.size}>
                  <PTableCell>{row.size}</PTableCell>
                  <PTableCell>{row.eu}</PTableCell>
                  <PTableCell>{row.us}</PTableCell>
                  <PTableCell>{row.uk}</PTableCell>
                  <PTableCell>{row.fr}</PTableCell>
                  <PTableCell>{row.it}</PTableCell>
                </PTableRow>
              ))}
            </PTableBody>
          </PTable>

          <div className="flex justify-end">
            <PButton
              onClick={() => setOpen(false)}
              type="button"
              variant="secondary"
            >
              {copy.close}
            </PButton>
          </div>
        </div>
      </PSheet>
    </>
  );
}
