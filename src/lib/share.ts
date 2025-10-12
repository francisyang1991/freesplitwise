// Native share functionality
export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export class ShareManager {
  private isNativeShareSupported(): boolean {
    return typeof navigator !== "undefined" && "share" in navigator;
  }

  async share(data: ShareData): Promise<boolean> {
    if (this.isNativeShareSupported()) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.log("Native share cancelled or failed:", error);
        return false;
      }
    }

    // Fallback to clipboard
    return this.fallbackToClipboard(data);
  }

  private async fallbackToClipboard(data: ShareData): Promise<boolean> {
    try {
      const text = [data.title, data.text, data.url].filter(Boolean).join("\n");
      await navigator.clipboard.writeText(text);
      
      // Show a toast or notification
      this.showShareNotification("Content copied to clipboard!");
      return true;
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      return false;
    }
  }

  private showShareNotification(message: string): void {
    // Create a simple toast notification
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  }

  async shareExpense(expense: any, groupName: string): Promise<boolean> {
    const shareData: ShareData = {
      title: `Expense: ${expense.description}`,
      text: `Expense: ${expense.description}\nAmount: ${expense.totalAmountCents / 100}\nGroup: ${groupName}`,
      url: window.location.href,
    };

    return this.share(shareData);
  }

  async shareGroup(group: any): Promise<boolean> {
    const shareData: ShareData = {
      title: `Group: ${group.name}`,
      text: `Join my group "${group.name}" on SplitNinja!`,
      url: `${window.location.origin}/invite/${group.inviteCode}`,
    };

    return this.share(shareData);
  }

  async shareSettlement(settlement: any, groupName: string): Promise<boolean> {
    const shareData: ShareData = {
      title: `Settlement: ${settlement.fromMember.name} → ${settlement.toMember.name}`,
      text: `Settlement in ${groupName}:\n${settlement.fromMember.name} owes ${settlement.toMember.name} ${settlement.amountCents / 100}`,
      url: window.location.href,
    };

    return this.share(shareData);
  }
}

export const shareManager = new ShareManager();
