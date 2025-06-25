export interface SelectorItem {
  selector: string;
  multiple: boolean;
}

export interface SelectorGroup {
  name: string;
  selectors: SelectorItem[];
  removeParent: boolean;
  style?: { [key: string]: string };
}