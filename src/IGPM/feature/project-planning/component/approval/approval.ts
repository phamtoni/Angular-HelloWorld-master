import {Component, EventEmitter, Inject, Input, OnInit, Output} from '@angular/core';
import {
    DateAdapter,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
    MAT_DIALOG_DATA,
    MatDialogRef,
    MatTableDataSource
} from '@angular/material';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ApprovalSandboxService} from "./approval-sandbox.service";
import {Observable, Subscription} from "rxjs";
import {
    ApprovalResponse,
    Milestone,
    ReviewCommitteeWrapper,
    SubprojectApproval,
    ApprovalDialogData,
    ApprovalHistory,
    YapApproval
} from "../../../../shared/business-domain";

import {MomentDateAdapter} from "@angular/material-moment-adapter";
import {DATE_FORMATS} from "../../../../shared/constants";
import * as moment from "moment";


@Component({
    selector: 'css-approval',
    templateUrl: './approval.component.html',
    styleUrls: ['./approval.component.scss'],
    providers: [
        {provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE]},
        {provide: MAT_DATE_FORMATS, useValue: DATE_FORMATS},
    ],
})
export class ApprovalComponent implements OnInit {

    /**
     * Array contains all subscriptions to observables.
     */
    subscriptions: Subscription[] = [];

    /**
     * Max number of characters for comment field
     */
    maxCommentLength : number = 43;

    /**
     * Max number of characters for protocol field
     */
    maxProtocolNoLength : number = 18;

    /**
     * Date configuration
     * Handling min/max date for date selection
     */
    today : Date = new Date();
    maxDate : Date = this.today;
    minDate : Date = new Date(this.today.getFullYear() - 101, 12, 1);

    modelFormGroup: FormGroup;

    subprojectApproval: SubprojectApproval;

    reviewCommitteeWrapper: ReviewCommitteeWrapper;

    milestones : Milestone[];

    /**
     * Array contains column titles of Approval History table.
     */
    approvalHistoryColumns: string[] = ['mcrSubProjectId', 'milestone', 'approvalDate','cancelled'];

    /**
     * Data source for Approval History table
     */
    public approvalHistory: MatTableDataSource<ApprovalHistory[]>;

    isLoading$: Observable<boolean> = this.sandbox.data.loading$;

    isSaving$: Observable<boolean> = this.sandbox.data.saving$;

    canApprove: boolean;

    /*
    * indicator to tell if component should have some extra fields
    * */
    @Input() isSubproject: boolean = true;

    @Output() approveCompletedEvent: EventEmitter<ApprovalResponse> = new EventEmitter<ApprovalResponse>();

    @Output() approveCompletedWithErrorEvent: EventEmitter<any> = new EventEmitter<any>();

    constructor(public dialogRef: MatDialogRef<ApprovalComponent>,
                private formBuilder: FormBuilder,
                @Inject(MAT_DIALOG_DATA) public data: ApprovalDialogData,
                public sandbox : ApprovalSandboxService) { }

    ngOnInit() {
        this.modelFormGroup = this.formBuilder.group({
            'reviewComittee': ['', [Validators.required]],
            'milestone': ['', [Validators.required]],
            'approvalDate': ['', [Validators.required]],
            'cancelled': [''],
            'protocolNumber': ['', Validators.maxLength(this.maxProtocolNoLength)],
            'comment': ['', Validators.maxLength(this.maxCommentLength)]
        }, {updateOn: 'blur'});

        this.canApprove = this.data.canApprove;

        this.isSubproject = !!this.data.mcrSubProjectId;

        this.initData();
    }

    ngOnDestroy() {
        this.subscriptions.forEach(subscription => subscription.unsubscribe);
    }

    private initData() {
        if (!this.canApprove) {
            this.modelFormGroup.disable();
        }

        this.modelFormGroup.controls["approvalDate"].setValue(this.today);

        this.getApprovalData(this.data.mcrProjectId, this.data.mcrSubProjectId , this.data.budId);

        let approvalSubscription = this.sandbox.data.subprojectApproval$.subscribe(data => {
            this.subprojectApproval = data;
        });
        this.subscriptions.push(approvalSubscription);

        let reviewCommitteesSubscription = this.sandbox.data.reviewCommittees$.subscribe(data => {
            if (!!data) {
                this.reviewCommitteeWrapper = data;
                this.modelFormGroup.controls["reviewComittee"].setValue(data.defaultReviewCommitteeId);
            }
        });
        this.subscriptions.push(reviewCommitteesSubscription);

        let milestonesSubscription = this.sandbox.data.milestones$.subscribe(data => {
            this.milestones = data;
        });

        this.subscriptions.push(milestonesSubscription);

        let approvalHistorySub = this.sandbox.data.approvalHistory$.subscribe(data => {
            this.approvalHistory = new MatTableDataSource(data);
        });

        this.subscriptions.push(approvalHistorySub);
    }

    private getApprovalData(mrcProjectID: number, mcrSubProjectId: number, budID: number) {
        this.sandbox.getApprovalData(mrcProjectID, mcrSubProjectId, budID, this.data.isSubproject);
    }

    onApprove() {
        let dataModel : YapApproval = new YapApproval();
        dataModel.mcrProjId = this.data.mcrProjectId;
        dataModel.mcrSubProjId = this.data.mcrSubProjectId;
        dataModel.reviewCommitteeId = this.modelFormGroup.controls["reviewComittee"].value;
        dataModel.nextMilestoneId = this.modelFormGroup.controls["milestone"].value;
        dataModel.cancelled = !!this.modelFormGroup.controls["cancelled"].value;

        let approvalDate: Date = this.modelFormGroup.controls["approvalDate"].value;

        dataModel.approvalDate = moment(approvalDate).format('YYYY-MM-DD');
        dataModel.protocolNumber = this.modelFormGroup.controls["protocolNumber"].value;
        dataModel.comment = this.modelFormGroup.controls["comment"].value;

        if (!!this.data.cssSubprojects && this.data.cssSubprojects.length > 0) {
            dataModel.newCssSubprojects = this.data.cssSubprojects;
        }

        dataModel.lastUpdatedSubProjects = this.data.lastUpdatedSubProjects;

        let subscription = this.sandbox.saveApprovalData(dataModel).subscribe((data: ApprovalResponse) => {
            if (!!data) {
                this.approveCompletedEvent.emit(data);
            }

            this.dialogRef.close();
        }, error => {
            this.dialogRef.close();
            this.approveCompletedWithErrorEvent.emit(error);
        });

        this.subscriptions.push(subscription);
    }

    /**
     * Function close dialog pop-up.
     */
    onClose(): void {
        this.dialogRef.close('cancel');
    }
}
