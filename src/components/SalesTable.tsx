
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Employee, Product, SaleLine } from "@/context/AppContext";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SalesTableProps {
  sales: SaleLine[];
  employees: Employee[];
  products: Product[];
  onCancelSale: (saleId: string) => void;
}

export const SalesTable: React.FC<SalesTableProps> = ({ sales, employees, products, onCancelSale }) => {
  const getEmployeeName = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";
  const getEmployeeRole = (id: string) => employees.find((e) => e.id === id)?.role ?? "";
  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? "—";

  // Group by employee for display/export
  const groupedByEmployee = sales.reduce(
    (acc, line) => {
      const existing = acc.get(line.employeeId);
      if (existing) {
        existing.push(line);
      } else {
        acc.set(line.employeeId, [line]);
      }
      return acc;
    },
    new Map<string, SaleLine[]>(),
  );

  const employeeOrder = new Map(employees.map((e, index) => [e.id, index]));

  const employeeGroups = Array.from(groupedByEmployee.entries())
    .map(([employeeId, lines]) => ({
      employeeId,
      lines,
      totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    }))
    .sort((a, b) => {
      const indexA = employeeOrder.get(a.employeeId) ?? Number.MAX_SAFE_INTEGER;
      const indexB = employeeOrder.get(b.employeeId) ?? Number.MAX_SAFE_INTEGER;
      return indexA - indexB;
    });

  const handleExportExcel = async () => {
    if (!employeeGroups.length) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sorties Personnels");

    // --- 1. Titre ---
    const date = new Date();
    const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(date).toUpperCase();
    const year = date.getFullYear();
    const title = `SORTIES STOCK PERSONNELS GVMA ${month} ${year}`;

    worksheet.mergeCells('B1:F4');
    const titleCell = worksheet.getCell('B1');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 16, bold: true, underline: true, color: { argb: '008000' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // --- 2. En-têtes ---
    const headerRowIdx = 6;
    const headers = ["S/C", "Personnel", "Fonction", "Produit", "Quantité"];

    worksheet.columns = [
      { width: 5 },  // A (Marge)
      { width: 8, key: 'sc' }, // B
      { width: 25, key: 'personnel' }, // C
      { width: 15, key: 'fonction' }, // D
      { width: 25, key: 'produit' }, // E
      { width: 10, key: 'qte' }, // F
    ];

    const headerRow = worksheet.getRow(headerRowIdx);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 2); // B=2
      cell.value = h;
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // --- 3. Données ---
    let currentRowIdx = headerRowIdx + 1;
    let indexGroup = 1;

    employeeGroups.forEach((group) => {
      const startRow = currentRowIdx;
      const totalLines = group.lines.length;

      group.lines.forEach((line, lineIdx) => {
        const row = worksheet.getRow(currentRowIdx);

        // Produit
        const cellProd = row.getCell(5);
        cellProd.value = getProductName(line.productId);
        cellProd.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cellProd.alignment = { vertical: 'middle', horizontal: 'left' };

        // Quantité
        const cellQty = row.getCell(6);
        cellQty.value = line.quantity;
        cellQty.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cellQty.alignment = { vertical: 'middle', horizontal: 'center' };

        // Cells for Merged Columns (S/C, Personnel, Fonction)
        const cellSC = row.getCell(2);
        cellSC.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (lineIdx === 0) {
          cellSC.value = indexGroup;
          cellSC.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        const cellPers = row.getCell(3);
        cellPers.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (lineIdx === 0) {
          cellPers.value = getEmployeeName(group.employeeId);
          cellPers.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        }

        const cellFunc = row.getCell(4);
        cellFunc.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        if (lineIdx === 0) {
          cellFunc.value = getEmployeeRole(group.employeeId);
          cellFunc.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        currentRowIdx++;
      });

      // Merge
      if (totalLines > 1) {
        worksheet.mergeCells(`B${startRow}:B${currentRowIdx - 1}`);
        worksheet.mergeCells(`C${startRow}:C${currentRowIdx - 1}`);
        worksheet.mergeCells(`D${startRow}:D${currentRowIdx - 1}`);
      }

      indexGroup++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `SORTIES_PERSONNELS_${month}_${year}.xlsx`);
  };

  const handleExportPdf = () => {
    if (!employeeGroups.length) return;

    const doc = new jsPDF();
    const date = new Date();
    const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(date).toUpperCase();
    const year = date.getFullYear();

    // Titre
    doc.setFontSize(14);
    doc.setTextColor(0, 128, 0); // Vert
    doc.text(`SORTIES STOCK PERSONNELS GVMA ${month} ${year}`, 105, 20, { align: "center" });
    doc.setDrawColor(0, 128, 0);
    doc.line(40, 22, 170, 22);

    const headers = [
      "S/C",
      "Personnel",
      "Fonction",
      "Produit",
      "Quantité"
    ];

    const body: any[][] = [];

    employeeGroups.forEach((group, groupIndex) => {
      const rowCount = group.lines.length;

      group.lines.forEach((line, lineIndex) => {
        const row = [
          // S/C
          lineIndex === 0 ? { content: groupIndex + 1, rowSpan: rowCount, styles: { valign: 'middle', halign: 'center' } } : "",
          // Personnel
          lineIndex === 0 ? { content: getEmployeeName(group.employeeId), rowSpan: rowCount, styles: { valign: 'middle', halign: 'left' } } : "",
          // Fonction
          lineIndex === 0 ? { content: getEmployeeRole(group.employeeId), rowSpan: rowCount, styles: { valign: 'middle', halign: 'center' } } : "",
          // Produit
          getProductName(line.productId),
          // Quantité
          { content: line.quantity, styles: { halign: 'center' } }
        ];
        body.push(row);
      });
    });

    autoTable(doc, {
      startY: 30,
      head: [headers],
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 8,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        1: { halign: 'left' },
        3: { halign: 'left' }
      }
    });

    doc.save(`SORTIES_PERSONNELS_${month}_${year}.pdf`);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-primary/10 bg-card/80 p-5 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold md:text-base">Récapitulatif des sorties</h2>
          <p className="text-xs text-muted-foreground">
            Vue consolidée des sorties enregistrées pour le personnel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={!sales.length}
            className="border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
          >
            Télécharger en Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={!sales.length}
            className="border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
          >
            Télécharger en PDF
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[320px] rounded-xl border bg-background/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="w-10 text-xs">S/C</TableHead>
              <TableHead className="text-xs">Personnel</TableHead>
              <TableHead className="text-xs">Fonction</TableHead>
              <TableHead className="text-xs">Produits</TableHead>
              <TableHead className="text-right text-xs">Quantité</TableHead>
              <TableHead className="text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employeeGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                  Aucune sortie enregistrée pour le moment. Utilisez le formulaire ci-dessus pour ajouter une première ligne.
                </TableCell>
              </TableRow>
            ) : (
              employeeGroups.map((group, groupIndex) => {
                const rowSpan = group.lines.length;
                return group.lines.map((line, lineIndex) => (
                  <TableRow key={line.id} className="text-xs odd:bg-background even:bg-muted/40">
                    {lineIndex === 0 && (
                      <>
                        <TableCell rowSpan={rowSpan}>{groupIndex + 1}</TableCell>
                        <TableCell rowSpan={rowSpan}>{getEmployeeName(group.employeeId)}</TableCell>
                        <TableCell rowSpan={rowSpan}>{getEmployeeRole(group.employeeId)}</TableCell>
                      </>
                    )}
                    <TableCell>{getProductName(line.productId)}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] text-destructive hover:text-destructive"
                        onClick={() => onCancelSale(line.id)}
                      >
                        Annuler
                      </Button>
                    </TableCell>
                  </TableRow>
                ));
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};
