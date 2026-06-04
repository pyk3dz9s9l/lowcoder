import styled, { css } from "styled-components";
import { isTransparentColor } from "lowcoder-design";

export const RowStyleProvider = styled.div<{
  $rowStyle: any;
  $showHRowGridBorder: boolean;
}>`
  /* Hide the measure row to avoid the extra space */
  tr.ant-table-measure-row {
    visibility: collapse;
  }
  
  .ant-table-tbody > tr {
    background: ${(props) => props.$rowStyle.background};
  }
  
  .ant-table-tbody > tr:nth-of-type(2n):not(.ant-table-row-selected) {
    background: ${(props) => props.$rowStyle.alternateBackground} !important;
  }

  .ant-table-tbody > tr.ant-table-row-selected {
    background: ${(props) => props.$rowStyle.selectedRowBackground} !important;
  }

  ${(props) => !isTransparentColor(props.$rowStyle.hoverRowBackground) && css`
    .ant-table-tbody > tr:hover:not(.ant-table-row-selected) {
      background: ${props.$rowStyle.hoverRowBackground} !important;
    }
  `}

  .ant-table-tbody > tr.ant-table-row-selected > td.ant-table-cell,
  .ant-table-tbody > tr:nth-of-type(2n):not(.ant-table-row-selected) > td.ant-table-cell {
    background: transparent !important;
  }

  ${(props) => !isTransparentColor(props.$rowStyle.hoverRowBackground) && css`
    .ant-table-tbody > tr:hover:not(.ant-table-row-selected) > td.ant-table-cell {
      background: transparent !important;
    }
  `}
  
  /* Horizontal grid borders */
  ${(props) => props.$showHRowGridBorder && `
    .ant-table-tbody > tr > td {
      border-bottom: ${props.$rowStyle.borderWidth} ${props.$rowStyle.borderStyle} ${props.$rowStyle.border};
    }
  `}
  
  /* Custom row CSS */
  ${(props) => props.$rowStyle?.customCSS || ''}
`;
