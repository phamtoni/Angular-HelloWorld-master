/*
 * Copyright 2018. (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {Component, ElementRef, EventEmitter, Inject, Input, OnInit, Output, ViewChild} from '@angular/core';
import {DOCUMENT} from "@angular/common";
import {MatDialog} from '@angular/material';
import {
    ApprovalDialogData,
    ApprovalPermission, ComparisonVersionType,
    CssMasterData,
    CssSubprojectApproval,
    McrMasterData,
    Project,
    ReadWriteHelper
} from "../../../../../../shared";
import {Subscription} from "rxjs";
import {SubprojectMessage, SubprojectEducationalMessage} from "../../../../../../shared/business-domain";
import * as MESSAGES from "../../../../../../shared/constants";

@Component({
    selector: 'css-mcr-master-data',
    templateUrl: './mcr-master-data.component.html',
    styleUrls: ['./mcr-master-data.component.scss']
})
export class McrMasterDataComponent implements OnInit {
    /**
     * Inject mcrMasterDataContent HTML element .
     */
    @ViewChild('mcrMasterDataContent') contentElemRef: ElementRef;

    @Input() mcrMasterData: McrMasterData;

    @Input() isMonthlyRateMissing: boolean;

    @Input() set isCurrencyMonthlyRateMissing(value : boolean) {
        if (value != null) {
            this.isMonthlyRateMissing = value;
        }
    }

    @Input() set cssMasterData(data : CssMasterData) {
        this.cssMasterDataObj = !!data ? data: new CssMasterData();
        if (!this.isCssSubprojectDataAvailable()) {
            this.canApprove = false;
        }
    }

    @Input() set approvalPermission(approval: ApprovalPermission) {
        if (approval) {
            this.isApproveButtonVisible = approval.approvable != null;
            this.canApprove =  this.readWriteHelper.getAccessRights(approval.approvable).isWritable;
        }
    }

    @Input() project: Project;

    @Input() set isIFRS15Relevant (value : boolean) {
        this.ifrsRevelant = value;
    }

    @Input() set isQG4LoadingBinding(isQG4Loading : boolean){
        this.isQG4Loading = isQG4Loading;
    };

    /**
     * Emit mcrPrjId to another component.
     */
    @Output() showAllQG4ClickedEvent: EventEmitter<number> = new EventEmitter<number>();

    @Output() approveStartedEvent: EventEmitter<ApprovalDialogData> = new EventEmitter();

    /**
     * Show/hide status for QG4 dialog.
     */
    showQG4: boolean;

    ifrsRevelant: boolean;

    rateNotFoundErrorMessages: string [] = [MESSAGES.SUBPROJECT_EX_RATE_NOT_FOUND];

    noQGC4Messages : string[] = [MESSAGES.NO_NEXT_QGC4_WARN_MESSAGE_LINE1,MESSAGES.NO_NEXT_QGC4_WARN_MESSAGE_LINE2];

    isQG4Loading : boolean;

    isApproveButtonVisible : boolean;

    canApprove: boolean;

    cssMasterDataObj: CssMasterData;

    /**
     * Array contains all subscriptions to observables.
     */
    subscriptions: Subscription[] = [];

    /**
     * Enum member variable for accessing enum values in html file.
     */
    subprojectEM = SubprojectEducationalMessage;

    constructor(public elementRef: ElementRef,
                @Inject(DOCUMENT) private document: Document,
                private readWriteHelper: ReadWriteHelper,
                public dialog: MatDialog) {
        document.addEventListener('click',(event: any)=>{
            if(event.target) {
                let qg4Id = event.target.id.toString();
                if (qg4Id !== "showAllGG4Button" && qg4Id.slice(0,4) !== "qg4-") {
                    this.showQG4 = false;
                }
            }
        })
    }

    ngOnDestroy() {
        document.removeEventListener('click',(event:any) => {});
        this.subscriptions.forEach(subscription => subscription.unsubscribe);
    }

    ngOnInit() {
        this.showQG4 = false;
    }

    onApproveButtonClicked() {
        let newCssSubprojects = null;
        if (!!this.cssMasterDataObj && !this.cssMasterDataObj.cssSubProjectID &&
            !!this.cssMasterDataObj.invoiceCustomer.id &&
            !!this.cssMasterDataObj.specialSaleCompCode.id) {
            newCssSubprojects = [new CssSubprojectApproval(
                this.mcrMasterData.mcrPrjId,
                this.cssMasterDataObj.invoiceCustomer.id,
                this.cssMasterDataObj.specialSaleCompCode.id)];
        }

        let data:ApprovalDialogData = { mcrProjectId: this.project.prjId,
            mcrSubProjectId: this.mcrMasterData.mcrPrjId,
            budId: this.mcrMasterData.budId,
            canApprove: this.canApprove,
            cssSubprojects:newCssSubprojects,
            isSubproject: true,
            project: this.project,
            lastUpdatedSubProjects: null
        };
        this.approveStartedEvent.emit(data);
    }

    /**
     * Open the showing all QG4s dialog.
     * @param mrcProjectId
     */
    openDialog(mcrPrjId: number) {
        this.showQG4 = !this.showQG4;
        this.showAllQG4ClickedEvent.emit(mcrPrjId);
    }
    /**
     * Close the showing all QG4s dialog
     */
    closeDialog(){
        this.showQG4 = false;
    }

    /**
     * Checks if company code & invoice customer is available.
     */
    private isCssSubprojectDataAvailable() {
        return  !!this.cssMasterDataObj &&
            !!this.cssMasterDataObj.invoiceCustomer &&
            !!this.cssMasterDataObj.invoiceCustomer.id &&
            !!this.cssMasterDataObj.specialSaleCompCode &&
            !!this.cssMasterDataObj.specialSaleCompCode.id
    }

    /**
     * Sets the educational messages on subproject level based the enum.
     * @param subprojectEM enum for subproject educational messages.
     */
    getEMText(subprojectEM: SubprojectEducationalMessage) : string {
        let subprojectMessage = new SubprojectMessage;
        return subprojectMessage.getMessageText(subprojectEM);
    }

    /**
     * Returns true if actual version is selected.
     */
    get isActualVersionSelected() : boolean {
        return this.project.selectedComparisonVersion.compId == ComparisonVersionType.ACTUAL
    }
}
