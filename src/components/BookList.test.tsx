import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import BookList from "./BookList";

const mockOnBooksChanged = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  mockOnBooksChanged.mockClear();
});

afterEach(cleanup);

const mockBooks = [
  {
    id: "book-1",
    title: "Test Book One",
    author: "Author One",
    format: "epub",
    total_words: 50000,
    progress_pct: 42.5,
  },
  {
    id: "book-2",
    title: "Test Book Two",
    author: null,
    format: "pdf",
    total_words: 12000,
    progress_pct: 0,
  },
];

describe("BookList", () => {
  it("shows empty state when no books", () => {
    render(<BookList books={[]} onBooksChanged={mockOnBooksChanged} />);
    expect(screen.getByText(/no books yet/i)).toBeInTheDocument();
  });

  it("renders book titles", () => {
    render(<BookList books={mockBooks} onBooksChanged={mockOnBooksChanged} />);
    expect(screen.getByText("Test Book One")).toBeInTheDocument();
    expect(screen.getByText("Test Book Two")).toBeInTheDocument();
  });

  it("renders author when present", () => {
    render(<BookList books={mockBooks} onBooksChanged={mockOnBooksChanged} />);
    expect(screen.getByText("Author One")).toBeInTheDocument();
  });

  it("shows format and word count", () => {
    render(<BookList books={mockBooks} onBooksChanged={mockOnBooksChanged} />);
    expect(screen.getByText(/EPUB/)).toBeInTheDocument();
    expect(screen.getByText(/50,000 words/)).toBeInTheDocument();
  });

  it("shows progress percentage", () => {
    render(<BookList books={mockBooks} onBooksChanged={mockOnBooksChanged} />);
    expect(screen.getByText("43%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("links to reader page", () => {
    render(<BookList books={mockBooks} onBooksChanged={mockOnBooksChanged} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/read/book-1");
    expect(links[1]).toHaveAttribute("href", "/read/book-2");
  });

  it("shows delete button for each book", () => {
    render(<BookList books={mockBooks} onBooksChanged={mockOnBooksChanged} />);
    expect(screen.getByLabelText("Delete Test Book One")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete Test Book Two")).toBeInTheDocument();
  });

  it("opens confirmation dialog on delete click", () => {
    render(<BookList books={mockBooks} onBooksChanged={mockOnBooksChanged} />);
    fireEvent.click(screen.getByLabelText("Delete Test Book One"));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Test Book One");
    expect(screen.getByText("Delete book and all data")).toBeInTheDocument();
    expect(screen.getByText("Delete book and keep progress")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("closes dialog on cancel", () => {
    render(<BookList books={mockBooks} onBooksChanged={mockOnBooksChanged} />);
    fireEvent.click(screen.getByLabelText("Delete Test Book One"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls DELETE and refreshes on full delete", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }))
    );

    render(<BookList books={mockBooks} onBooksChanged={mockOnBooksChanged} />);
    fireEvent.click(screen.getByLabelText("Delete Test Book One"));
    fireEvent.click(screen.getByText("Delete book and all data"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/books/book-1", { method: "DELETE" });
      expect(mockOnBooksChanged).toHaveBeenCalled();
    });
  });

  it("calls DELETE with keepProgress and refreshes", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }))
    );

    render(<BookList books={mockBooks} onBooksChanged={mockOnBooksChanged} />);
    fireEvent.click(screen.getByLabelText("Delete Test Book Two"));
    fireEvent.click(screen.getByText("Delete book and keep progress"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/books/book-2?keepProgress=true",
        { method: "DELETE" }
      );
      expect(mockOnBooksChanged).toHaveBeenCalled();
    });
  });
});
