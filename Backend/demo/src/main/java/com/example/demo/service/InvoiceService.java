package com.example.demo.service;

import com.example.demo.model.Invoice;
import com.example.demo.model.InvoiceItem;
import com.example.demo.repository.InvoiceRepository;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import com.itextpdf.text.pdf.draw.LineSeparator;

import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

@Service
public class InvoiceService {
    private final InvoiceRepository repository;

    public InvoiceService(InvoiceRepository repository) {
        this.repository = repository;
    }

    public Invoice saveInvoice(Invoice invoice) {
        invoice.getItems().forEach(item -> item.setInvoice(invoice));
        return repository.save(invoice);
    }

    public Invoice getInvoice(Long id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Invoice not found"));
    }

    public ByteArrayInputStream generatePdf(Long id) {
        Invoice invoice = getInvoice(id);

        Document document = new Document(PageSize.A4, 40, 40, 50, 50);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // === HEADER (Company + INVOICE text) ===
            PdfPTable header = new PdfPTable(2);
            header.setWidthPercentage(100);
            header.setWidths(new int[]{2, 1});

             if (invoice.getLogo() != null) {
            Image logo = Image.getInstance(invoice.getLogo());
            logo.scaleToFit(80, 80);
            PdfPCell logoCell = new PdfPCell(logo);
            logoCell.setBorder(Rectangle.NO_BORDER);
            logoCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            header.addCell(logoCell);
            } else {
            PdfPCell emptyCell = new PdfPCell(new Phrase(""));
            emptyCell.setBorder(Rectangle.NO_BORDER);
            header.addCell(emptyCell);
            }

            // Company Info
            Font companyFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, BaseColor.BLACK);
            Paragraph companyDetails = new Paragraph("Stoic And Salamandar\nThe Global Corporation", companyFont);
            companyDetails.setAlignment(Element.ALIGN_LEFT);

            PdfPCell companyCell = new PdfPCell(companyDetails);
            companyCell.setBorder(Rectangle.NO_BORDER);
            companyCell.setVerticalAlignment(Element.ALIGN_MIDDLE);

            // INVOICE Title
            Font invoiceFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 24, BaseColor.BLUE);
            Paragraph invoiceText = new Paragraph("INVOICE", invoiceFont);
            invoiceText.setAlignment(Element.ALIGN_RIGHT);

            PdfPCell invoiceCell = new PdfPCell(invoiceText);
            invoiceCell.setBorder(Rectangle.NO_BORDER);
            invoiceCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            invoiceCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

            header.addCell(companyCell);
            header.addCell(invoiceCell);
            document.add(header);

            document.add(new LineSeparator());
            document.add(Chunk.NEWLINE);

            // === CUSTOMER DETAILS ===
            PdfPTable customerTable = new PdfPTable(2);
            customerTable.setWidthPercentage(100);
            customerTable.setSpacingBefore(10f);
            customerTable.setSpacingAfter(20f);
            customerTable.setWidths(new int[]{1, 2});

            addCustomerRow(customerTable, "Invoice No:", invoice.getInvoiceNumber());
            addCustomerRow(customerTable, "Invoice Date:", invoice.getInvoiceDate().toString());
            addCustomerRow(customerTable, "Due Date:", invoice.getDueDate().toString());
            addCustomerRow(customerTable, "Customer Name:", invoice.getCustomerName());
            addCustomerRow(customerTable, "Email:", invoice.getCustomerEmail());
            addCustomerRow(customerTable, "Address:", invoice.getCustomerAddress());

            document.add(customerTable);

            // === ITEMS TABLE ===
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new int[]{4, 1, 2, 2});
            table.setSpacingBefore(10f);

            Font headFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, BaseColor.WHITE);
            String[] headers = {"Description", "Qty", "Price", "Total"};

            for (String h : headers) {
                PdfPCell hcell = new PdfPCell(new Phrase(h, headFont));
                hcell.setBackgroundColor(new BaseColor(63, 81, 181)); // blue
                hcell.setHorizontalAlignment(Element.ALIGN_CENTER);
                hcell.setPadding(10);
                table.addCell(hcell);
            }

            double grandTotal = 0;
            boolean alternate = false;
            for (InvoiceItem item : invoice.getItems()) {
                BaseColor bg = alternate ? new BaseColor(245, 245, 245) : BaseColor.WHITE;

                table.addCell(getStyledCell(item.getDescription(), bg));
                table.addCell(getStyledCell(String.valueOf(item.getQuantity()), bg));
                table.addCell(getStyledCell("₹" + String.format("%.2f", item.getPrice()), bg));
                double total = item.getQuantity() * item.getPrice();
                table.addCell(getStyledCell("₹" + String.format("%.2f", total), bg));

                grandTotal += total;
                alternate = !alternate;
            }

            document.add(table);

            // === SUMMARY ===
            PdfPTable summary = new PdfPTable(2);
            summary.setWidthPercentage(40);
            summary.setHorizontalAlignment(Element.ALIGN_RIGHT);
            summary.setSpacingBefore(15f);

            double tax = grandTotal * 0.10; // 10% tax
            double total = grandTotal + tax;

            addSummaryRow(summary, "Subtotal", "₹" + String.format("%.2f", grandTotal));
            addSummaryRow(summary, "Tax (10%)", "₹" + String.format("%.2f", tax));
            addSummaryRow(summary, "Grand Total", "₹" + String.format("%.2f", total));

            document.add(summary);

            // === NOTES ===
            if (invoice.getNotes() != null && !invoice.getNotes().isEmpty()) {
                Paragraph notesPara = new Paragraph("Notes: " + invoice.getNotes(),
                        FontFactory.getFont(FontFactory.HELVETICA, 12));
                notesPara.setSpacingBefore(15f);
                document.add(notesPara);
            }

            // === FOOTER ===
            Paragraph footer = new Paragraph("Thank you for your business!\nPayment due within 15 days.",
                    FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 11, BaseColor.GRAY));
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.setSpacingBefore(30f);
            document.add(footer);

            document.close();

        } catch (Exception e) {
            throw new RuntimeException("Error generating PDF", e);
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    // ---------- Utility Methods ----------
    private void addCustomerRow(PdfPTable table, String label, String value) {
        table.addCell(getCell(label, true));
        table.addCell(getCell(value, false));
    }

    private PdfPCell getCell(String text, boolean bold) {
        Font font = bold ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)
                : FontFactory.getFont(FontFactory.HELVETICA, 12);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(8);
        cell.setBorder(Rectangle.NO_BORDER);
        return cell;
    }

    private PdfPCell getStyledCell(String text, BaseColor bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FontFactory.getFont(FontFactory.HELVETICA, 11)));
        cell.setBackgroundColor(bg);
        cell.setPadding(8f);
        return cell;
    }

    private void addSummaryRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12)));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, FontFactory.getFont(FontFactory.HELVETICA, 12)));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }
}
