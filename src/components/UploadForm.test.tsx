import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import UploadForm from "./UploadForm";

const mockOnUploadComplete = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  mockOnUploadComplete.mockClear();
});

afterEach(cleanup);

describe("UploadForm", () => {
  it("renders file input and upload button", () => {
    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    expect(screen.getByLabelText("Select book file")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload" })).toBeInTheDocument();
  });

  it("accepts only epub and pdf files", () => {
    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    const input = screen.getByLabelText("Select book file");
    expect(input).toHaveAttribute("accept", ".epub,.pdf");
  });

  it("shows error for unsupported file types", async () => {
    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    const input = screen.getByLabelText("Select book file") as HTMLInputElement;
    const file = new File(["content"], "test.txt", { type: "text/plain" });

    Object.defineProperty(input, "files", { value: [file], writable: false });
    fireEvent.submit(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Only EPUB and PDF files are supported."
      );
    });
  });

  it("calls onUploadComplete after successful upload", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "1" }), { status: 201 })
    );

    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    const input = screen.getByLabelText("Select book file") as HTMLInputElement;
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });

    Object.defineProperty(input, "files", { value: [file], writable: false });
    fireEvent.submit(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalled();
    });
  });

  it("shows error on upload failure", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Parse failed" }), { status: 422 })
    );

    render(<UploadForm onUploadComplete={mockOnUploadComplete} />);
    const input = screen.getByLabelText("Select book file") as HTMLInputElement;
    const file = new File(["content"], "bad.epub", { type: "application/epub+zip" });

    Object.defineProperty(input, "files", { value: [file], writable: false });
    fireEvent.submit(screen.getByRole("button", { name: "Upload" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Parse failed");
    });
  });
});
