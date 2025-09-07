package com.example.demo.controller;

import com.example.demo.model.Invoice;
import com.example.demo.service.InvoiceService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;

@RestController
@RequestMapping("/api/invoices")
@CrossOrigin(origins = "http://localhost:3000") // allow React
public class InvoiceController {

    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    @PostMapping
    public Invoice saveInvoice(@RequestBody Invoice invoice) {
        return service.saveInvoice(invoice);
    }

      // Save invoice with logo upload
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Invoice> saveInvoice(
            @RequestPart("invoice") Invoice invoice,
            @RequestPart(value = "logo", required = false) MultipartFile logo) throws IOException {

        if (logo != null && !logo.isEmpty()) {
            invoice.setLogo(logo.getBytes());
        }
        Invoice saved = service.saveInvoice(invoice);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        ByteArrayInputStream bis = service.generatePdf(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=invoice_" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(bis.readAllBytes());
    }
}
