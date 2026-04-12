import { type App, Modal, Setting } from "obsidian";
import type { CliOutputMode } from "../types";

export type QueryFormat = "markdown" | "report" | "slides" | "chart" | "image";

export interface QueryModalResult {
  question: string;
  format: QueryFormat;
  outputMode: CliOutputMode;
  save: boolean;
}

export interface QueryModalOptions {
  initialQuestion?: string;
  defaultOutputMode: CliOutputMode;
  defaultFormat?: QueryFormat;
  hasSelection: boolean;
  onSubmit: (result: QueryModalResult) => void | Promise<void>;
}

export class QueryModal extends Modal {
  private question: string;
  private format: QueryFormat;
  private outputMode: CliOutputMode;
  private save: boolean = true;

  constructor(
    app: App,
    private readonly opts: QueryModalOptions
  ) {
    super(app);
    this.question = opts.initialQuestion ?? "";
    this.format = opts.defaultFormat ?? "markdown";
    this.outputMode = opts.defaultOutputMode;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "SwarmVault query" });

    new Setting(contentEl).setName("Question").addTextArea((t) => {
      t.setValue(this.question);
      t.onChange((v) => {
        this.question = v;
      });
      t.inputEl.rows = 6;
      t.inputEl.style.width = "100%";
    });

    new Setting(contentEl).setName("Format").addDropdown((dd) =>
      dd
        .addOption("markdown", "Markdown")
        .addOption("report", "Report")
        .addOption("slides", "Slides")
        .addOption("chart", "Chart")
        .addOption("image", "Image")
        .setValue(this.format)
        .onChange((v) => {
          this.format = v as QueryFormat;
        })
    );

    const output = new Setting(contentEl).setName("Output").setDesc("Where to put the answer.");
    output.addDropdown((dd) => {
      if (this.opts.hasSelection) dd.addOption("inline-replace", "Replace selection");
      dd.addOption("append-note", "Append to note")
        .addOption("wiki-outputs", "Write to wiki/outputs/")
        .addOption("ephemeral-pane", "New ephemeral pane")
        .setValue(this.outputMode)
        .onChange((v) => {
          this.outputMode = v as CliOutputMode;
        });
    });

    new Setting(contentEl)
      .setName("Save to wiki/outputs/")
      .setDesc("Also persist the answer as a markdown file under wiki/outputs.")
      .addToggle((t) =>
        t.setValue(this.save).onChange((v) => {
          this.save = v;
        })
      );

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText("Ask")
          .setCta()
          .onClick(async () => {
            const q = this.question.trim();
            if (!q) return;
            this.close();
            await this.opts.onSubmit({
              question: q,
              format: this.format,
              outputMode: this.outputMode,
              save: this.save
            });
          })
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
