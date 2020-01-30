import {Component, OnInit} from '@angular/core';
import {GridOptions} from "ag-grid-community";
import {AgGridColumn} from "ag-grid-angular";
import {
    ProjectOverview,
    RouterLinkRendererComponent,
    GenericAgDatasource,
    IGenericAgDatasource,
    ProjectOverviewService
} from "../../../../shared";

@Component({
    selector: 'css-project-overview-table',
    templateUrl: './project-overview-table.component.html',
    styleUrls: ['./project-overview-table.component.scss']
})
export class ProjectOverviewTableComponent implements OnInit {

    datasource: GenericAgDatasource<ProjectOverview>;

    gridOptions: GridOptions;

    nameOfResults: string = "Subprojects";

    /**
     * Instantiates the GenericAgDatasource with the ProjectOverviewService and applies the GridOptions definition.
     * @param projectOverviewService
     */
    constructor(private projectOverviewService: ProjectOverviewService) {
        this.datasource = new GenericAgDatasource<ProjectOverview>(this.projectOverviewService);

        const columnDefList: AgGridColumn[] | any[] = this.createColumnDefsProjectOverview(this.datasource);
        this.gridOptions = this.createGridOptions(this.datasource, columnDefList);
    }

    ngOnInit() {
    }

    /**
     * Creates the basic GridOptions.
     * @param datasource
     * @param columnDefList
     */
    private createGridOptions(datasource: IGenericAgDatasource<any>, columnDefList: AgGridColumn[] | any[]): GridOptions {
        return {
            columnDefs: columnDefList,
            rowHeight: 48,
            headerHeight: 48,
            animateRows: true,
            floatingFilter: true,
            floatingFiltersHeight: 48,
        };
    }

    /**
     * Creates the specific column definitions for the ProjectOverview ag-Grid table.
     * @param datasource
     */
    private createColumnDefsProjectOverview(datasource: IGenericAgDatasource<any>): AgGridColumn[] | any[] {
        return [
            {
                headerName: 'MCR PrjID',
                hide: true,
                colId: 'prjId',
            },
            {
                headerName: 'P-ID',
                colId: 'pid',
                field: 'pid',
                sortable: true,
                suppressMenu: true,
                filter: 'agNumberColumnFilter',
                filterParams: {
                    suppressAndOrCondition: true
                },
                width: 90,
                cellClass: 'right'
            },
            {
                headerName: 'MCR Project-ID',
                colId: 'prjDisplayId',
                field: 'prjDisplayId',
                sortable: true,
                suppressMenu: true,
                filter: "agTextColumnFilter",
                filterParams: {
                    suppressAndOrCondition: true,
                    caseSensitive: true
                },
                cellStyle: {
                    cursor: 'pointer',
                    color: '#0000ee'
                },
                cellRendererFramework: RouterLinkRendererComponent,
                cellRendererParams: {
                    routerLink: (params: any) => ['/project-overview/project-planning', params.value],
                    fragment: (params: any) => !!params.data && !!params.data.prjId ? params.data.prjId + '' : ''
                },
                width: 140,
            },
            {
                headerName: 'MCR Project Name',
                colId: 'prjName',
                field: 'prjName',
                sortable: true,
                suppressMenu: true,
                filter: "agTextColumnFilter",
                filterParams: {
                    suppressAndOrCondition: true,
                    caseSensitive: true
                },
                width: 250
            },
            {
                headerName: 'MCR Subproject-ID',
                colId: 'prjSubDisplayId',
                field: 'prjSubDisplayId',
                sortable: true,
                suppressMenu: true,
                filter: "agTextColumnFilter",
                filterParams: {
                    suppressAndOrCondition: true,
                    caseSensitive: true
                },
                width: 170
            },
            {
                headerName: 'MCR Subproject Name',
                colId: 'prjSubName',
                field: 'prjSubName',
                sortable: true,
                suppressMenu: true,
                filter: "agTextColumnFilter",
                filterParams: {
                    suppressAndOrCondition: true,
                    caseSensitive: true
                },
                width: 250
            },
            {
                headerName: 'BU',
                colId: 'buCode',
                field: 'buCode',
                sortable: true,
                suppressMenu: true,
                filter: "agTextColumnFilter",
                filterParams: {
                    suppressAndOrCondition: true,
                    caseSensitive: true
                },
                width: 100
            },
            {
                headerName: 'PDCL',
                colId: 'pdclCode',
                field: 'pdclCode',
                sortable: true,
                suppressMenu: true,
                filter: "agTextColumnFilter",
                filterParams: {
                    suppressAndOrCondition: true,
                    caseSensitive: true
                },
                width: 120,
                cellClass: 'right'
            },
            {
                headerName: 'PDCL Name',
                colId: 'pdclName',
                field: 'pdclName',
                sortable: true,
                suppressMenu: true,
                filter: "agTextColumnFilter",
                filterParams: {
                    suppressAndOrCondition: true,
                    caseSensitive: true
                },
                width: 260
            },
            {
                headerName: 'RB Customer',
                colId: 'acquiRBCusName',
                field: 'acquiRBCusName',
                sortable: true,
                suppressMenu: true,
                filter: "agTextColumnFilter",
                filterParams: {
                    suppressAndOrCondition: true,
                    caseSensitive: true
                },
                width: 160
            },
            {
                headerName: 'GCT',
                colId: 'gctName',
                field: 'gctName',
                sortable: true,
                suppressMenu: true,
                filter: "agTextColumnFilter",
                filterParams: {
                    suppressAndOrCondition: true,
                    caseSensitive: true
                },
                width: 120
            },
            {
                headerName: 'CA',
                colId: 'caName',
                field: 'caName',
                sortable: true,
                suppressMenu: true,
                filter: "agTextColumnFilter",
                filterParams: {
                    suppressAndOrCondition: true,
                    caseSensitive: true
                },
                width: 120
            }
        ];
    }
    hello(){
        console.log("tai sao con khoc ");
    }

}
