/*
 * Copyright 2019 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {
    Component,
    Input,
    OnInit,
    ChangeDetectionStrategy,
    Output,
    EventEmitter,
    ViewEncapsulation,
    ChangeDetectorRef
} from '@angular/core';
import {
    ComparisonVersion,
    CssMasterData, ProjectValue,
    ReadWriteHelper,
    CurrentOTP,
    CurrentPAO,
    SubprojectData,
    SubprojectDataChange,
    convertToNumber,
    isValidIntegerNumber,
    getValueFromPasteEvent,
    transformNumberLocale, LocaleNumberPipe,
} from "../../../../shared";
import * as MESSAGES from "../../../../shared/constants/messages.constant";
import {DOWN_ARROW, UP_ARROW} from "@angular/cdk/keycodes";
import * as moment from 'moment';

@Component({
    selector: 'css-planning-table',
    templateUrl: './planning-table.component.html',
    styleUrls: ['./planning-table.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [LocaleNumberPipe]
})
export class PlanningTableComponent implements OnInit {

    /**
     * Array contains column titles of table which are grouped by 2 columns
     */
    displayedGroup:string[] = ['yearGroup', 'cost','otp','pao','otp-pao','css'];

    /**
     * Array contains column titles of table.
     */
    displayedColumns: string[] = ['year', 'currentCost', 'actualCost','currentOTP', 'actualOTP','currentPAO', 'actualPAO','currentOTPPAO', 'actualOTPPAO','currentCSS', 'actualCSS'];
    readWriteHelper: ReadWriteHelper;
    projectValue : ProjectValue[];

    @Input() pinned: boolean;

    constructor(private pipe: LocaleNumberPipe) {
    }

    ngOnInit() {
        this.readWriteHelper = new ReadWriteHelper();
    }

    /**
     * Component attribute contains project values which is used as data source of table.
     */
    @Input() set dataSource(data: ProjectValue[]) {
        this.projectValue = data;
        if (!!data) {
            data.forEach(projectValue => {
                this.updateSubprojectDataList(projectValue,this.subprojectDataList);
            });
        }
    }

    /**
     * Component attribute identifies comparison version ( Actuals, YAP)
     */
    @Input() comparisonVersion: ComparisonVersion;

    /**
     * Component attribute indicates read mode or not. In update mode, some editable input
     * fields will be visible.
     */
    @Input() isReadOnly: boolean;

    /**
     * Component attribute indicates show or hide detail rows of table.
     */
    @Input() detailValueVisible: boolean

    /*
    * indicator to tell if table will be shown in subprojects
    * */
    @Input() isSubprojects: boolean;

    @Input() cssMasterData? : CssMasterData; //optional for project table: it contains subprojects read/write flag
    @Input() subprojectId? : number; //optional for projects, required for subprojects

    /**
     * Event emits SubprojectData array which contains changed values.
     */
    @Output() subprojectDataChangedEvent: EventEmitter<SubprojectDataChange[]> = new EventEmitter<SubprojectDataChange[]>();

    /**
     * Array contains changed values.
     */
    subprojectDataList: SubprojectDataChange[] = [];

    /**
     * Function calculates total value of a specific column name.
     * @param columnName
     */
    getTotalValueOf(columnName:string) {
        if (this.projectValue) {
            let data = this.projectValue.filter(dataRow=>{
                if (this.isSubprojects && columnName == 'currentOTP'){
                    return dataRow.currentOTPDtl && !dataRow.currentOTPDtl.error
                }
                if (this.isSubprojects && columnName == 'currentPAO'){
                    return  dataRow.currentPAODtl && !dataRow.currentPAODtl.error
                }

                return true;
            });

            if (this.isDataRowNotEmpty(columnName)) {
                return data.map(t => t[columnName]).reduce((acc, value) =>   acc + Math.round(value) , 0);
            }

        }

        return null;
    }

    private isDataRowNotEmpty(columnName:string) {
        let data = this.projectValue.filter(dataRow => {
            return dataRow[columnName] != null;
        });
        return !!data && data.length > 0;
    }

    /**
     * Function calculates sum of OTP & PAO
     * @param element
     */
    getCurrentOTPPAOSum(element: ProjectValue) {
        if ( (element.currentOTPDtl && !element.currentOTPDtl.error) || (element.currentPAODtl && !element.currentPAODtl.error ) ) {
            if (element.currentOTP != null || element.currentPAO != null) {
                let sum = 0;
                sum += element.currentOTPDtl && !element.currentOTPDtl.error && element.currentOTP != null ? Math.round(element.currentOTP) : 0;
                sum += element.currentPAODtl && !element.currentPAODtl.error && element.currentPAO != null ?  Math.round(element.currentPAO) : 0;

                return sum;
            }
        }

        return null;
    }


    /**
     * Function calculates total percentage value of sumOTPPAO & cost.
     * @param sumOTPPAO
     * @param cost
     */
    getTotalPercentValueOf(sumOTPPAO:string,cost:string) {
        let totalOTPPAO = this.getTotalValueOf(sumOTPPAO);
        let totalCost = this.getTotalValueOf(cost);

        if (totalCost && totalCost != 0) {
            if (totalOTPPAO/totalCost === 0 || totalOTPPAO/totalCost == null) {
                return null;
            }
            return (totalOTPPAO/totalCost);
        }
        return null;
    }

    /*
    * a function which gets the index of subproject item inside its datasource
    * */
    getIndexOfItem(element: ProjectValue) {
        return this.projectValue.indexOf(element);
    }

    /*
      * a function which will tell if field is editable or not
      * step one: check if we have general access to write fields or not with getReadWriteAccess() function
      * step two: field is editable only for current year, current year -1 and future years
      * */
    isFieldWritable(subprojectItem: SubprojectData) {
        if(this.cssMasterData) {
            let currentYear = moment().year();
            let generalReadWriteAccess = this.getReadWriteAccess(this.cssMasterData.ifrsVersionId);

            if(generalReadWriteAccess) {
                if(subprojectItem.year < (currentYear - 1)) {
                    return false;
                }
                return true;
            } else {
                return false;
            }
        }
        return false;
    }

    /*
    * this function returns true if field can be writable
    * based on rules : the range of numbers [1-4] as write access and [5-8] as read access
    * */
    getReadWriteAccess(indicator: number) {
        return this.readWriteHelper.getAccessRights(indicator).isWritable;
    }

    /**
     * @desc Triggered when a key is pressed while the input is focused
     */
    handleKeyUp(event: any) {
        event.stopImmediatePropagation();

        if (event.keyCode === DOWN_ARROW || event.keyCode === UP_ARROW) {
            event.preventDefault();
            var nextInputId = this.getNextInput( event.target.id, event.keyCode );
            if(document.getElementById(nextInputId)) {
                document.getElementById(nextInputId).focus();
            }
            return false;
        }
    }

    /**
     * Triggered when a key is pressed down while the input is focused
     * @param event
     */
    onKeyPress(event: KeyboardEvent) {
        if (event.keyCode === DOWN_ARROW || event.keyCode === UP_ARROW) {
            event.preventDefault();
        }
    }

    /**
     * Handles when leaving the field.
     * @param args
     */
    handleBlurEvent(args: any) {
        if (args) {
            let value = args.target.value;
            if(this.isValidInput(value)) {
                let numberValue = this.getInputValueAsNumber(value);
                args.target.value = this.pipe.transform(numberValue,'1.0-0');
            }
        }
    }

    /**
     * Handles when Enter key is pressed.
     * @param event
     */
    onKeydown(event) {
        if (event.key === "Enter") {
            event.target.blur();
        }
    }

    /**
     * Handles when otp field is pasted.
     * @param event
     * @param year
     * @param currentOTP
     * @param dataRow
     */
    otpValuePasted(event,year : number, currentOTP: CurrentOTP, dataRow?: ProjectValue) {
        let pastedData = getValueFromPasteEvent(event);
        let value = convertToNumber(pastedData);
        if (!!value) {
            this.updateCurrentOtpError(dataRow,false);
            this.handleOtpValueChanged(value,year,currentOTP,dataRow);
        } else {
            dataRow.currentOTP = pastedData;
            this.updateCurrentOtpError(dataRow,true);
        }
    }

    /**
     * Function handles otp value change for one year
     * and updates SubprojectData array which contains subproject values
     * @param args
     * @param year
     * @param currentOTP
     */
    otpValueChanged(args: any,year : number, currentOTP: CurrentOTP, dataRow?: ProjectValue) {
        this.handleOtpValueChanged(args.target.value, year, currentOTP, dataRow);
    }

    /**
     * Function gets otp value change and update data model.
     * @param value
     * @param year
     * @param currentOTP
     * @param dataRow
     */
    handleOtpValueChanged(value: any, year : number, currentOTP: CurrentOTP, dataRow?: ProjectValue) {
        let foundSubprojectDataChange = this.subprojectDataList.find(subprojectDataChange => {
            let subprojectData = subprojectDataChange.subprojectData;
            return currentOTP && subprojectData.currentOTP &&
                subprojectData.currentOTP.subPrjOtpValueId == currentOTP.subPrjOtpValueId &&
                subprojectData.year == year
        });

        // Update currentOTP into dataRow to force other formula calculations
        if(this.isValidInput(value)) {
            dataRow.currentOTP = this.getInputValueAsNumber(value);
            this.updateCurrentOtpError(dataRow,false);
        } else {
            dataRow.currentOTP = value;
            this.updateCurrentOtpError(dataRow,true);
        }

        if (foundSubprojectDataChange) {
            currentOTP = foundSubprojectDataChange.subprojectData.currentOTP;
            currentOTP.otpValue = this.getInputValueAsNumber(value);
        } else if (currentOTP) {
            currentOTP.otpValue =  this.getInputValueAsNumber(value);
        } else {
            currentOTP = new CurrentOTP();
            currentOTP.otpValue =  this.getInputValueAsNumber(value);
        }
        currentOTP.error = !this.isValidInput(value);

        this.updateSubprojectDataListForCurrentOTP(year, currentOTP, this.subprojectDataList);
        this.subprojectDataChangedEvent.emit(this.subprojectDataList);
    }

    /**
     * Function handles pao value change for one year
     * and updates SubprojectData array which contains subproject values
     * @param args
     * @param year
     * @param currentPAO
     */
    paoValueChanged(args: any,year : number, currentPAO: CurrentPAO, dataRow?:ProjectValue) {
        this.handlePaoValueChanged(args.target.value, year, currentPAO, dataRow);
    }

    /**
     * Function handles pao field is pasted
     * @param event
     * @param year
     * @param currentPAO
     * @param dataRow
     */
    paoValuePasted(event,year : number, currentPAO: CurrentPAO, dataRow?:ProjectValue) {
        let pastedData = getValueFromPasteEvent(event);
        let value = convertToNumber(pastedData);
        if (!!value) {
            this.updateCurrentPaoError(dataRow,false);
            this.handlePaoValueChanged(value,year,currentPAO,dataRow);
        } else {
            dataRow.currentPAO = pastedData;
            this.updateCurrentPaoError(dataRow,true);
        }
    }

    /**
     * Function gets PAO value change and update data model.
     * @param value
     * @param year
     * @param currentPAO
     * @param dataRow
     */
    handlePaoValueChanged(value: any, year : number, currentPAO: CurrentPAO, dataRow?:ProjectValue) {
        // Update currentPAO into dataRow to force other formula calculations
        if(this.isValidInput(value)) {
            dataRow.currentPAO =  this.getInputValueAsNumber(value);
            this.updateCurrentPaoError(dataRow,false);
        } else {
            dataRow.currentPAO = value;
            this.updateCurrentPaoError(dataRow,true);
        }

        let foundSubprojectDataChange = this.subprojectDataList.find(subprojectDataChanged => {
            let subprojectData = subprojectDataChanged.subprojectData;
            return currentPAO && subprojectData.currentPAO &&
                subprojectData.currentPAO.subPrjPaoValueId == currentPAO.subPrjPaoValueId &&
                subprojectData.year == year
        });
        if (foundSubprojectDataChange) {
            currentPAO = foundSubprojectDataChange.subprojectData.currentPAO;
            currentPAO.paoValue = this.getInputValueAsNumber(value);
        } else if (currentPAO) {
            currentPAO.paoValue = this.getInputValueAsNumber(value);
        } else {
            currentPAO = new CurrentPAO();
            currentPAO.paoValue =  this.getInputValueAsNumber(value);
        }

        currentPAO.error = !this.isValidInput(value);
        this.updateSubprojectDataListForCurrentPAO(year,currentPAO,this.subprojectDataList);
        this.subprojectDataChangedEvent.emit(this.subprojectDataList);
    }

    /**
     * Funtion update SubprojectData array for a given year and CurrentPAO
     * @param year
     * @param currentPAO
     * @param subprojectDataList
     */
    updateSubprojectDataListForCurrentPAO(year: number,currentPAO: CurrentPAO, subprojectDataList: SubprojectDataChange[]) {
        let currentSubprojectDataChange = subprojectDataList.find(subprojectDataChange => subprojectDataChange.subprojectData.year == year);
        if (currentSubprojectDataChange) {
            currentSubprojectDataChange.subprojectData.currentPAO = currentPAO;
        } else {
            let subprojectData = new SubprojectData();
            subprojectData.year = year;
            subprojectData.currentPAO = currentPAO;
            let subprojectDataChange = new SubprojectDataChange(subprojectData);
            subprojectDataList.push(subprojectDataChange);
        }
    }

    /**
     * Funtion update SubprojectData array for a given year and CurrentOTP
     * @param year
     * @param currentOtp
     * @param subprojectDataList
     */
    updateSubprojectDataListForCurrentOTP(year: number,currentOtp: CurrentOTP, subprojectDataList: SubprojectDataChange[]) {
        let currentSubprojectDataChange = subprojectDataList.find(subprojectDataChange => subprojectDataChange.subprojectData.year == year);
        if (currentSubprojectDataChange) {
            currentSubprojectDataChange.subprojectData.currentOTP = currentOtp;
        } else {
            let subprojectData = new SubprojectData();
            subprojectData.year = year;
            subprojectData.currentOTP = currentOtp;
            let subprojectDataChange = new SubprojectDataChange(subprojectData);
            subprojectDataList.push(subprojectDataChange);
        }
    }

    /**
     * Function updates subprojectDataList with new project value from data source.
     * @param projectValue
     * @param subprojectDataList
     */
    updateSubprojectDataList(projectValue: ProjectValue, subprojectDataList: SubprojectDataChange[]) {
        let currentSubprojectDataChange = subprojectDataList.find(subprojectDataChange => subprojectDataChange.subprojectData.year == projectValue.year);
        if (currentSubprojectDataChange) {
            if (currentSubprojectDataChange.subprojectData.currentOTP) {
                currentSubprojectDataChange.subprojectData.currentOTP.otpValue = projectValue.currentOTP;
            }

            if (currentSubprojectDataChange.subprojectData.currentPAO) {
                currentSubprojectDataChange.subprojectData.currentPAO.paoValue = projectValue.currentPAO;
            }
        }
    }

    /*
    * Function which return the id on next element to be focused
    * @param id
    * @param keyCode
    * */
    getNextInput(id: string, keyCode: number) {
        if(keyCode === DOWN_ARROW) {
            //increase id to get next input
            let prefix = id.substr(0, id.indexOf('_'));
            let idValue = Number(id.split("_").pop()) + 1;
            let nextId = prefix + "_" + idValue;

            return nextId;
        } else if(keyCode == UP_ARROW) {
            //decrease it to get next input

            let prefix = id.substr(0, id.indexOf('_'));
            let idValue = Number(id.split("_").pop()) - 1;
            let nextId = prefix + "_" + idValue;

            return nextId;
        }
    }

    /**
     * Function calculates current css value based on currentCost && currentOTP && currentPAO
     * @param projectValue
     */
    getCurrentCSS(projectValue: ProjectValue) {
        let currentOTPPAO = projectValue.currentOTP || projectValue.currentPAO ? (
            (projectValue.currentOTPDtl && !projectValue.currentOTPDtl.error && projectValue.currentOTP ? Math.round(projectValue.currentOTP) : 0) +
            (projectValue.currentPAODtl && !projectValue.currentPAODtl.error && projectValue.currentPAO ?  Math.round(projectValue.currentPAO) : 0) )
            : null;
        projectValue.currentOTPPAO = currentOTPPAO;
        // The table in the subproject view shows rounded currentCost values. The calculation of current css value has to use the rounded currentCost values (Math.round is mandatory for projectValue.currentCost).
        let roundedProjCurCost = Math.round(projectValue.currentCost);
        let currentCSSValue = currentOTPPAO && projectValue.currentCost && (projectValue.currentCost != 0) && (roundedProjCurCost != 0) ? (currentOTPPAO / roundedProjCurCost) : null;
        return currentCSSValue; // use | localePercent in view will multiple by 100
    }

    /**
     * Function calculates actual css value based on actualCost && actualOTP && actualPAO
     * @param projectValue
     */
    getAcutualCSS(projectValue: ProjectValue) {
        let actualOTPPAO = projectValue.actualOTP || projectValue.actualPAO ? ( ( (projectValue.actualOTP ? Math.round(projectValue.actualOTP) : 0)  + (projectValue.actualPAO ? Math.round(projectValue.actualPAO) : 0) ) ) : null;
        projectValue.actualOTPPAO = actualOTPPAO;
        let roundedProjActCost = Math.round(projectValue.actualCost);
        let actualCSSValue = actualOTPPAO && projectValue.actualCost && (projectValue.actualCost != 0) && (roundedProjActCost != 0) ? (actualOTPPAO / roundedProjActCost) : null; // use | localePercent in view will multiple by 100
        return actualCSSValue;
    }

    /**
     * Checks if value is in valid number format, e.g. valid integer or empty string
     * @param value
     */
    isValidInput(value: string): boolean {
        return (isValidIntegerNumber(value) || (value === ''));
    }

    isNumber(value: any) {
        return !isNaN(value);
    }

    /**
     * Converts a value to number if it is a valid number format
     * If value is empty, return null.
     * @param value
     */
    getInputValueAsNumber(value: any) {
        if (value == "") {
            return null;
        }
        if ((typeof value === 'string')) {
            const transformedValue = transformNumberLocale(value);
            return this.isValidInput(value) ? Number(transformedValue) : value;
        } else {
            return this.isValidInput(value) ? Number(value) : value;
        }
    }

    /**
     * Update error for otp
     * @param dataRow
     * @param error
     */
    updateCurrentOtpError(dataRow: ProjectValue, error: boolean) {
        dataRow.currentOTPDtl =  !!dataRow.currentOTPDtl ? Object.assign({},dataRow.currentOTPDtl) : new CurrentOTP();
        dataRow.currentOTPDtl.error = error;
    }

    /**
     * Update error for pao
     * @param dataRow
     * @param error
     */
    updateCurrentPaoError(dataRow: ProjectValue, error: boolean) {
        dataRow.currentPAODtl =  !!dataRow.currentPAODtl ? Object.assign({},dataRow.currentPAODtl)   : new CurrentPAO();
        dataRow.currentPAODtl.error = error;
    }
}
