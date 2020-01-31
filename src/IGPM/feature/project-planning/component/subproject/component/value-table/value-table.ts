/*
 * Copyright 2018. (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {
    ComparisonVersion,
    CssMasterData,
    Subproject,
    SubprojectDataChange,
    SubProjectVersion
} from "../../../../../../shared/business-domain";

@Component({
    selector: 'css-value-table',
    templateUrl: './value-table.component.html',
    styleUrls: ['./value-table.component.scss']
})
export class ValueTableComponent implements OnInit {

    constructor() { }

    cssMasterData: CssMasterData; //contains read/write flag
    subprojectId : number;// uses as indicator for editable cells ID
    subprojectVersion: SubProjectVersion;

    /**
     * Event emits SubprojectData array which contains changed values.
     */
    @Output() subprojectDataChangedEvent: EventEmitter<SubprojectDataChange[]> = new EventEmitter<SubprojectDataChange[]>();

    @Input() isReadOnly: boolean;

    @Input() pinned: boolean;

    @Input() set subprojectVersionData(data: SubProjectVersion) {
        this.subprojectVersion = data;
        if (data && this.comparisonVersion ) {
            this.version = this.comparisonVersion;
        }
    }

    subprojectModel: Subproject;

    /**
     * Component attribute identifies comparison version ( Actuals, YAP)
     */
    comparisonVersion: ComparisonVersion;

    dataSource: any;

    ngOnInit() {
        this.subprojectModel = new Subproject();
    }
    /**
     * Component attribute identifies comparison version ( Actuals, YAP)
     */
    @Input() set version(version: ComparisonVersion) {
        this.comparisonVersion = version;
        let subproject = this.subprojectVersion.versionSubprojectMap.get(version.compId);
        if (subproject) {
            this.cssMasterData = subproject.cssMasterData;
            this.subprojectId = subproject.mcrMasterData ? subproject.mcrMasterData.mcrPrjId : null;
            this.dataSource = subproject.getFormattedData();
            if(this.dataSource) {
                this.dataSource.sort((projectValue1, projectValue2) => {
                    if (projectValue1.year < projectValue2.year) return -1;
                    else if (projectValue1.year > projectValue2.year) return 1;
                    else return 0;
                });
            }
        }
    }

    subprojectDataChanged(data: SubprojectDataChange[]){
        this.subprojectDataChangedEvent.emit(data);
    }
}
