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
  const [logoFile, setLogoFile] = useState(null); // ✅ new state for logo
  const [logoPreview, setLogoPreview] = useState(null); // ✅ preview

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

  const handleItemChange = (e, index, key) => {
    const { value } = e.target;
    const updatedItems = invoiceDetails.items.map((item, i) =>
      i === index ? { ...item, [key]: value } : item
    );
    setInvoiceDetails((prev) => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setInvoiceDetails((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, price: 0 }],
    }));
  };

  const removeItem = (index) => {
    const updatedItems = invoiceDetails.items.filter((_, i) => i !== index);
    setInvoiceDetails((prev) => ({ ...prev, items: updatedItems }));
  };

  const calculateTotal = () => {
    return invoiceDetails.items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      return total + quantity * price;
    }, 0);
  };

  // ✅ Save Invoice with Logo Upload
  const saveInvoice = async () => {
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

    if (logoFile) {
      formData.append("logo", logoFile);
    }

    try {
      const res = await axios.post("http://localhost:8083/api/invoices", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Invoice Saved!");
      return res.data; // return saved invoice
    } catch (err) {
      console.error(err);
      alert("Error saving invoice");
    }
  };

  // ✅ Generate PDF
  const generatePdf = async () => {
    setPdfLoading(true);
    try {
      const savedInvoice = await saveInvoice(); // Save first
      if (!savedInvoice) throw new Error("Invoice not saved");

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
    <div className="container my-5">
      <h1 className="text-center mb-4">Invoice Generator</h1>

      <div className="row">
        {/* ---------- Left: Invoice Form ---------- */}
        <div className="col-md-6 bg-light p-4 rounded shadow-sm">
          <h4 className="mb-3">Invoice Details</h4>
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label">Invoice Number</label>
              <input
                type="text"
                className="form-control"
                value={invoiceDetails.invoiceNumber}
                onChange={(e) => handleInputChange(e, "invoiceNumber")}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Invoice Date</label>
              <input
                type="date"
                className="form-control"
                value={invoiceDetails.invoiceDate}
                onChange={(e) => handleInputChange(e, "invoiceDate")}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-control"
              value={invoiceDetails.dueDate}
              onChange={(e) => handleInputChange(e, "dueDate")}
            />
          </div>

          <h4 className="mt-4">Bill To</h4>
          <div className="mb-3">
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Name"
              value={invoiceDetails.billTo.name}
              onChange={(e) => handleInputChange(e, "billTo", "name")}
            />
            <input
              type="email"
              className="form-control mb-2"
              placeholder="Email"
              value={invoiceDetails.billTo.email}
              onChange={(e) => handleInputChange(e, "billTo", "email")}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Address"
              value={invoiceDetails.billTo.address}
              onChange={(e) => handleInputChange(e, "billTo", "address")}
            />
          </div>

          <h4 className="mt-4">Items</h4>
          {invoiceDetails.items.map((item, index) => (
            <div className="row mb-2" key={index}>
              <div className="col-md-5">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(e, index, "description")}
                />
              </div>
              <div className="col-md-2">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(e, index, "quantity")}
                />
              </div>
              <div className="col-md-2">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => handleItemChange(e, index, "price")}
                />
              </div>
              <div className="col-md-2 d-flex align-items-center">
                <strong>${(item.quantity * item.price).toFixed(2)}</strong>
              </div>
              <div className="col-md-1 d-flex align-items-center">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => removeItem(index)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <button className="btn btn-success mb-3" onClick={addItem}>
            + Add Item
          </button>

          {/* ✅ Logo Upload */}
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

          <div className="d-flex justify-content-between align-items-center">
            <h5>Total: ${calculateTotal()}</h5>
            <button
              onClick={generatePdf}
              disabled={pdfLoading}
              className="btn btn-primary"
            >
              {pdfLoading ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>

        {/* ---------- Right: Invoice Preview ---------- */}
        <div className="col-md-6 p-4">
          <div className="border rounded shadow-sm bg-white p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="text-primary">INVOICE</h3>
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Logo Preview"
                  style={{ maxHeight: "60px", objectFit: "contain" }}
                />
              )}
            </div>

            <div className="d-flex justify-content-between mb-3">
              <div>
                <p>
                  <strong>Invoice #:</strong>{" "}
                  {invoiceDetails.invoiceNumber || "N/A"}
                </p>
                <p>
                  <strong>Date:</strong> {invoiceDetails.invoiceDate}
                </p>
                <p>
                  <strong>Due:</strong> {invoiceDetails.dueDate || "N/A"}
                </p>
              </div>
              <div className="text-end">
                <h5>Bill To</h5>
                <p>{invoiceDetails.billTo.name || "Client Name"}</p>
                <p>{invoiceDetails.billTo.email || "client@email.com"}</p>
                <p>{invoiceDetails.billTo.address || "Client Address"}</p>
              </div>
            </div>

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
                    <td className="text-end">{item.price}</td>
                    <td className="text-end">
                      {(item.quantity * item.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-end">
              <h5>Grand Total: {calculateTotal()}</h5>
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
