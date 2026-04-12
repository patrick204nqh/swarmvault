import { type App, Modal, Setting } from "obsidian";

export interface SimpleInputModalOptions {
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  multiline?: boolean;
  onSubmit: (value: string) => void | Promise<void>;
}

export class SimpleInputModal extends Modal {
  private value: string;

  constructor(
    app: App,
    private readonly opts: SimpleInputModalOptions
  ) {
    super(app);
    this.value = opts.initialValue ?? "";
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: this.opts.title });
    if (this.opts.description) {
      contentEl.createEl("p", { text: this.opts.description });
    }

    const setting = new Setting(contentEl);
    if (this.opts.multiline) {
      setting.addTextArea((t) => {
        t.setPlaceholder(this.opts.placeholder ?? "").setValue(this.value);
        t.onChange((v) => {
          this.value = v;
        });
        t.inputEl.rows = 6;
        t.inputEl.style.width = "100%";
      });
    } else {
      setting.addText((t) => {
        t.setPlaceholder(this.opts.placeholder ?? "").setValue(this.value);
        t.onChange((v) => {
          this.value = v;
        });
        t.inputEl.style.width = "100%";
      });
    }

    new Setting(contentEl)
      .addButton((b) =>
        b
          .setButtonText(this.opts.submitLabel ?? "Run")
          .setCta()
          .onClick(async () => {
            const v = this.value.trim();
            if (!v) return;
            this.close();
            await this.opts.onSubmit(v);
          })
      )
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
