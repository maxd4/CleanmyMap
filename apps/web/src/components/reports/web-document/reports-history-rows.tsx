"use client";

import { FileText } from "lucide-react";
import {
  HistoryActionButtons,
  HistoryActionFeedback,
  type ReportsWebDocumentDeliveryHistoryProps,
} from "./reports-web-document-delivery";

type HistoryRow = ReportsWebDocumentDeliveryHistoryProps["recentRows"][number];
type HistoryActionProps = Parameters<typeof HistoryActionButtons>[0];

function ReportsHistoryMobileRows({
  rows,
  actionProps,
  actionStateById,
}: {
  rows: HistoryRow[];
  actionProps: (row: HistoryRow) => HistoryActionProps;
  actionStateById: NonNullable<
    ReportsWebDocumentDeliveryHistoryProps["actionStateById"]
  >;
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {rows.map((row) => (
        <article
          key={row.id}
          className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <FileText size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h4 className="break-words text-base font-semibold text-slate-950">
                {row.report}
              </h4>
              <p className="mt-1 break-words text-sm text-slate-600">
                {row.generatedAt}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Période</dt>
              <dd className="mt-1 break-words font-medium text-slate-900">
                {row.period}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Périmètre</dt>
              <dd className="mt-1 break-words font-medium text-slate-900">
                {row.perimeter}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500">Détail</dt>
              <dd className="mt-1 break-words font-medium text-slate-900">
                {row.detail}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Thème PDF</dt>
              <dd className="mt-1 break-words font-medium text-slate-900">
                {row.theme === "scientific"
                  ? "Scientifique"
                  : row.theme === "impact"
                    ? "Impact"
                    : "Non enregistré"}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <HistoryActionButtons {...actionProps(row)} />
            <HistoryActionFeedback actionState={actionStateById[row.id]} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function ReportsHistoryRows(
  props: ReportsWebDocumentDeliveryHistoryProps,
) {
  const theme = props.theme ?? "impact";
  const actionStateById = props.actionStateById ?? {};
  const publicationPreviewById = props.publicationPreviewById ?? {};
  const actionProps = (
    row: ReportsWebDocumentDeliveryHistoryProps["recentRows"][number],
  ) => ({
    row,
    theme,
    rowId: row.id,
    actionState: actionStateById[row.id],
    onView: props.onView,
    onReexport: props.onReexport,
    onPrint: props.onPrint ?? (() => undefined),
    onDerive: props.onDerive ?? (() => undefined),
    onCopyReference: props.onCopyReference ?? (() => undefined),
    onExportJson: props.onExportJson ?? (() => undefined),
    onExportCsv: props.onExportCsv ?? (() => undefined),
    onResume: props.onResume ?? (() => undefined),
    publicationPreview: publicationPreviewById[row.id],
    onPublish: props.onPublish ?? (() => undefined),
    onConfirmPublication: props.onConfirmPublication ?? (() => undefined),
    onCancelPublication: props.onCancelPublication ?? (() => undefined),
    onRevokePublication: props.onRevokePublication ?? (() => undefined),
  });
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
        <table className="cmm-data-table">
          <caption className="sr-only">
            Historique de mes rapports générés
          </caption>
          <thead className="bg-slate-50 text-xs normal-case tracking-normal text-slate-500">
            <tr>
              {[
                "Rapport",
                "Période",
                "Périmètre",
                "Détail",
                "Thème PDF",
                "Généré le",
                "Actions",
              ].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="font-semibold normal-case tracking-normal"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.recentRows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <FileText size={16} aria-hidden="true" />
                    </div>
                    <p className="break-words text-sm font-semibold text-slate-900">
                      {row.report}
                    </p>
                  </div>
                </td>
                <td className="break-words text-sm text-slate-600">
                  {row.period}
                </td>
                <td className="break-words text-sm text-slate-600">
                  {row.perimeter}
                </td>
                <td className="break-words text-sm text-slate-600">
                  {row.detail}
                </td>
                <td className="break-words text-sm text-slate-600">
                  {row.theme === "scientific"
                    ? "Scientifique"
                    : row.theme === "impact"
                      ? "Impact"
                      : "Non enregistré"}
                </td>
                <td className="break-words text-sm text-slate-600">
                  {row.generatedAt}
                </td>
                <td>
                  <HistoryActionButtons {...actionProps(row)} />
                  <HistoryActionFeedback
                    actionState={actionStateById[row.id]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ReportsHistoryMobileRows
        rows={props.recentRows}
        actionProps={actionProps}
        actionStateById={actionStateById}
      />
    </>
  );
}
