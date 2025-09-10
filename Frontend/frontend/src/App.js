import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";

const App = () => {
  const [invoiceDetails, setInvoiceDetails] = useState({
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    billTo: { name: "", address: "", email: "" },
    items: [{ description: "", quantity: 1, price: 0 }],
    notes: "",
  });

  const [pdfLoading, setPdfLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // ✅ Format Date
  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-GB");
  };

  // ✅ Format Currency
  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  // ✅ Handle input change
  const handleInputChange = (e, key, nestedKey) => {
    const { value } = e.target;
    if (nestedKey) {
      setInvoiceDetails((prev) => ({
        ...prev,
        [key]: { ...prev[key], [nestedKey]: value },
      }));
    } else {
      setInvoiceDetails((prev) => ({ ...prev, [key]: value }));
    }
  };

  // ✅ Item change
  const handleItemChange = (e, index, key) => {
    let { value } = e.target;
    if (key === "quantity") value = Math.max(1, parseInt(value) || 1);
    if (key === "price") value = Math.max(0, parseFloat(value) || 0);

    const updatedItems = invoiceDetails.items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    setInvoiceDetails((prev) => ({ ...prev, items: updatedItems }));
  };

  // ✅ Add item
  const addItem = () => {
    const lastItem = invoiceDetails.items[invoiceDetails.items.length - 1];
    if (!lastItem.description || lastItem.price <= 0) {
      alert("Please complete the last item before adding a new one.");
      return;
    }
    setInvoiceDetails((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, price: 0 }],
    }));
  };

  // ✅ Remove item
  const removeItem = (index) => {
    const updatedItems = invoiceDetails.items.filter((_, i) => i !== index);
    setInvoiceDetails((prev) => ({ ...prev, items: updatedItems }));
  };

  // ✅ Totals
  const calculateTotal = () =>
    invoiceDetails.items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      return total + quantity * price;
    }, 0);

  const TAX_RATE = 0.10;
  const subtotal = calculateTotal();
  const taxAmount = subtotal * TAX_RATE;
  const grandTotal = subtotal + taxAmount;

  // ✅ Email validation
  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ✅ Form validation before saving
  const validateForm = () => {
    if (!invoiceDetails.invoiceNumber.trim()) {
      alert("Invoice number is required.");
      return false;
    }
    if (!invoiceDetails.invoiceDate) {
      alert("Invoice date is required.");
      return false;
    }
    if (!invoiceDetails.dueDate) {
      alert("Due date is required.");
      return false;
    }
    if (!invoiceDetails.billTo.name.trim()) {
      alert("Customer name is required.");
      return false;
    }
    if (!isValidEmail(invoiceDetails.billTo.email)) {
      alert("Please enter a valid customer email.");
      return false;
    }
    if (!invoiceDetails.billTo.address.trim()) {
      alert("Customer address is required.");
      return false;
    }
    if (
      invoiceDetails.items.length === 0 ||
      !invoiceDetails.items[0].description ||
      invoiceDetails.items[0].price <= 0
    ) {
      alert("At least one valid item is required.");
      return false;
    }
    return true;
  };

  // ✅ Save Invoice
  const saveInvoice = async () => {
    if (!validateForm()) return null;

    const formData = new FormData();
    const invoice = {
      invoiceNumber: invoiceDetails.invoiceNumber,
      invoiceDate: invoiceDetails.invoiceDate,
      dueDate: invoiceDetails.dueDate,
      customerName: invoiceDetails.billTo.name,
      customerEmail: invoiceDetails.billTo.email,
      customerAddress: invoiceDetails.billTo.address,
      notes: invoiceDetails.notes,
      items: invoiceDetails.items,
    };

    formData.append(
      "invoice",
      new Blob([JSON.stringify(invoice)], { type: "application/json" })
    );
    if (logoFile) formData.append("logo", logoFile);

    try {
      const res = await axios.post("http://localhost:8083/api/invoices", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (err) {
      console.error(err);
      alert("Error saving invoice");
      return null;
    }
  };

  // ✅ Generate PDF
  const generatePdf = async () => {
    setPdfLoading(true);
    try {
      const savedInvoice = await saveInvoice();
      if (!savedInvoice) return;

      const pdfResponse = await fetch(
        `http://localhost:8083/api/invoices/${savedInvoice.id}/pdf`
      );
      if (!pdfResponse.ok) throw new Error("Failed to download PDF");

      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${savedInvoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Error generating PDF. Check backend logs.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="container my-4">
      <h1 className="text-center mb-4">Invoice Generator</h1>

      <div className="row g-4">
        {/* ---------- Left: Invoice Form ---------- */}
        <div className="col-12 col-lg-6 bg-light p-4 rounded shadow-sm">
          <h4 className="mb-3">Invoice Details</h4>
          <div className="row mb-3">
            <div className="col-12 col-md-6 mb-3 mb-md-0">
              <label className="form-label">Invoice Number *</label>
              <input
                type="text"
                className="form-control"
                required
                value={invoiceDetails.invoiceNumber}
                onChange={(e) => handleInputChange(e, "invoiceNumber")}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Invoice Date *</label>
              <input
                type="date"
                className="form-control"
                required
                value={invoiceDetails.invoiceDate}
                onChange={(e) => handleInputChange(e, "invoiceDate")}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Due Date *</label>
            <input
              type="date"
              className="form-control"
              required
              value={invoiceDetails.dueDate}
              onChange={(e) => handleInputChange(e, "dueDate")}
            />
          </div>

          <h4 className="mt-4">Bill To</h4>
          <div className="mb-3">
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Name *"
              required
              value={invoiceDetails.billTo.name}
              onChange={(e) => handleInputChange(e, "billTo", "name")}
            />
            <input
              type="email"
              className="form-control mb-2"
              placeholder="Email *"
              required
              value={invoiceDetails.billTo.email}
              onChange={(e) => handleInputChange(e, "billTo", "email")}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Address *"
              required
              value={invoiceDetails.billTo.address}
              onChange={(e) => handleInputChange(e, "billTo", "address")}
            />
          </div>

          <h4 className="mt-4">Items *</h4>
          {invoiceDetails.items.map((item, index) => (
            <div className="row mb-2 align-items-center" key={index}>
              <div className="col-12 col-md-5 mb-2 mb-md-0">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Description *"
                  required
                  value={item.description}
                  onChange={(e) => handleItemChange(e, index, "description")}
                />
              </div>
              <div className="col-6 col-md-2 mb-2 mb-md-0">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Qty"
                  min="1"
                  required
                  value={item.quantity}
                  onChange={(e) => handleItemChange(e, index, "quantity")}
                />
              </div>
              <div className="col-6 col-md-2 mb-2 mb-md-0">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Price"
                  min="0"
                  required
                  value={item.price}
                  onChange={(e) => handleItemChange(e, index, "price")}
                />
              </div>
              <div className="col-6 col-md-2 text-md-end mb-2 mb-md-0">
                <strong>{formatCurrency(item.quantity * item.price)}</strong>
              </div>
              <div className="col-6 col-md-1 text-md-center">
                <button
                  type="button"
                  className="btn btn-danger btn-sm w-100"
                  onClick={() => removeItem(index)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-success mb-3 w-100" onClick={addItem}>
            + Add Item
          </button>

          <div className="mb-3">
            <label className="form-label">Company Logo</label>
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={(e) => {
                setLogoFile(e.target.files[0]);
                setLogoPreview(URL.createObjectURL(e.target.files[0]));
              }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Notes</label>
            <textarea
              className="form-control"
              rows="3"
              value={invoiceDetails.notes}
              onChange={(e) => handleInputChange(e, "notes")}
            />
          </div>

          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <h5>Total: {formatCurrency(subtotal)}</h5>
            <button
              type="button"
              onClick={generatePdf}
              disabled={pdfLoading}
              className="btn btn-primary mt-2 mt-md-0"
            >
              {pdfLoading ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>

        {/* ---------- Right: Invoice Preview ---------- */}
        <div className="col-12 col-lg-6 p-4">
          <div className="border rounded shadow-sm bg-white p-4">
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
              <h3 className="text-primary">INVOICE</h3>
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Logo Preview"
                  style={{ maxHeight: "60px", objectFit: "contain" }}
                />
              )}
            </div>

            <div className="d-flex justify-content-between mb-3 flex-wrap">
              <div>
                <p>
                  <strong>Invoice #:</strong>{" "}
                  {invoiceDetails.invoiceNumber || "N/A"}
                </p>
                <p>
                  <strong>Date:</strong> {formatDate(invoiceDetails.invoiceDate)}
                </p>
                <p>
                  <strong>Due:</strong> {formatDate(invoiceDetails.dueDate)}
                </p>
              </div>
              <div className="text-end">
                <h5>Bill To</h5>
                <p>{invoiceDetails.billTo.name || "Client Name"}</p>
                <p>{invoiceDetails.billTo.email || "client@email.com"}</p>
                <p>{invoiceDetails.billTo.address || "Client Address"}</p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Price</th>
                    <th className="text-end">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceDetails.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.description || "-"}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-end">{formatCurrency(item.price)}</td>
                      <td className="text-end">
                        {formatCurrency(item.quantity * item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-end">
              <p>Subtotal: {formatCurrency(subtotal)}</p>
              <p>Tax (10%): {formatCurrency(taxAmount)}</p>
              <h5>Grand Total: {formatCurrency(grandTotal)}</h5>
            </div>

            {invoiceDetails.notes && (
              <div className="mt-3">
                <strong>Notes:</strong>
                <p>{invoiceDetails.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
