// utils.ts
type CSVRow = { OID: string; Query: string };

let csvData: CSVRow[] = [];

export const setCSVData = (data: CSVRow[]) => {
  csvData = data;
};

export const getCSVData = (): CSVRow[] => csvData;
