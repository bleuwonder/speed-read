import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import Reader from "./Reader";

const defaultProps = {
  bookId: "book-1",
  initialChapterIndex: 0,
  initialWordIndex: 0,
  initialWpm: 300,
  totalChapters: 2,
  chapterTitles: ["Chapter One", "Chapter Two"],
};

const ch1Words = ["the", "quick", "brown", "fox"];
const ch2Words = ["speed", "reading", "is", "fun"];

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(global, "fetch").mockImplementation(async (url) => {
    const urlStr = url.toString();
    if (urlStr.includes("/chapters/0")) {
      return new Response(JSON.stringify({ words: ch1Words }));
    }
    if (urlStr.includes("/chapters/1")) {
      return new Response(JSON.stringify({ words: ch2Words }));
    }
    if (urlStr.includes("/progress")) {
      return new Response(JSON.stringify({ ok: true }));
    }
    return new Response("{}", { status: 404 });
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Reader", () => {
  it("loads and displays first word on mount", async () => {
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    const display = screen.getByTestId("word-display");
    expect(display).toHaveTextContent("the");
  });

  it("displays ORP highlight on the correct letter", async () => {
    render(<Reader {...defaultProps} initialWordIndex={1} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    // "quick" - ORP at index 1 (floor(5/2)-1 = 1) -> "u"
    const display = screen.getByTestId("word-display");
    const redSpan = display.querySelector(".text-red-500");
    expect(redSpan).toHaveTextContent("u");
  });

  it("shows play button initially", async () => {
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.getByLabelText("Play")).toBeInTheDocument();
  });

  it("toggles to pause on play click", async () => {
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    fireEvent.click(screen.getByLabelText("Play"));
    expect(screen.getByLabelText("Pause")).toBeInTheDocument();
  });

  it("advances words when playing", async () => {
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId("word-display")).toHaveTextContent("the");

    fireEvent.click(screen.getByLabelText("Play"));

    // Advance one word interval (60000/300 = 200ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    const display = screen.getByTestId("word-display");
    expect(display).toHaveTextContent("quick");
  });

  it("shows WPM value", async () => {
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.getByTestId("wpm-display")).toHaveTextContent("300 WPM");
  });

  it("updates WPM on slider change", async () => {
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    const slider = screen.getByLabelText("Words per minute");
    fireEvent.change(slider, { target: { value: "500" } });
    expect(screen.getByTestId("wpm-display")).toHaveTextContent("500 WPM");
  });

  it("has chapter selector with titles", async () => {
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    const select = screen.getByLabelText("Chapter");
    expect(select).toBeInTheDocument();
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Chapter One");
    expect(options[1]).toHaveTextContent("Chapter Two");
  });

  it("jumps to new chapter on select change", async () => {
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.change(screen.getByLabelText("Chapter"), { target: { value: "1" } });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const display = screen.getByTestId("word-display");
    expect(display).toHaveTextContent("speed");
  });

  it("saves progress on pause", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Play then pause
    fireEvent.click(screen.getByLabelText("Play"));
    fireEvent.click(screen.getByLabelText("Pause"));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const progressCalls = fetchSpy.mock.calls.filter(
      (call) => call[0]?.toString().includes("/progress") && call[1]?.method === "PUT"
    );
    expect(progressCalls.length).toBeGreaterThan(0);
  });

  it("responds to space key for play/pause", async () => {
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByLabelText("Pause")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByLabelText("Play")).toBeInTheDocument();
  });

  it("responds to arrow keys for word skipping", async () => {
    render(<Reader {...defaultProps} />);
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("word-display")).toHaveTextContent("quick");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("word-display")).toHaveTextContent("the");
  });
});
