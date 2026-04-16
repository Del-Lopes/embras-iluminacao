import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react'

export const Table = ({ className = '', ...props }: HTMLAttributes<HTMLTableElement>) => (
  <div className="data-table-wrapper">
    <table className={`data-table ${className}`} {...props} />
  </div>
)

export const TableHeader = (props: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead {...props} />
)

export const TableBody = (props: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody {...props} />
)

export const TableRow = ({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={`data-table-row ${className}`} {...props} />
)

export const TableHead = ({ className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`data-table-head ${className}`} {...props} />
)

export const TableCell = ({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`data-table-cell ${className}`} {...props} />
)
