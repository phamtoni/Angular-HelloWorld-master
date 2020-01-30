/*
 * Copyright 2019 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {Injectable} from "@angular/core";
import {select, Store} from "@ngrx/store";
import {
    ApprovalResponse,
    ApprovalService, ReviewCommittee,
    ReviewCommitteeWrapper,
    Subproject,
    SubprojectApproval
} from "../../../../shared/business-domain";
import {Selectors} from "../../+state/project-planning-state.types";
import * as ApprovalActions from "../../+state/approval/approval.actions";
import * as MESSAGES from "../../../../shared/constants/messages.constant";
import {MessageDialogService} from "../../../../shared/dialog/message-dialog.service";
import {HttpErrorCode, muteFirst, ServiceErrorCode, ServiceStatusCode, SnackBarService} from "../../../../shared";
import {Observable, of} from "rxjs";
import {YapApproval} from "../../../../shared/business-domain/project-planning/approval/yap-approval.model";
import {filter, share, startWith, switchMap} from "rxjs/operators";

/**
 * Service gets approval data and save a current project data set on project/subproject level as a YAP/YAC version
 * (=latest approved plan version) and at the same time as a PEP-milestone-version of CSS.
 */
@Injectable()
export class ApprovalSandboxService {
    constructor(
        public store: Store<any>,
        public approvalService: ApprovalService,
        public messageDialogService: MessageDialogService,
        private snackBar: SnackBarService,
    ) {

    }

    private fromStore = {
        approval: {
            loading$: this.store.pipe(select(Selectors.approval.loading)),
            saving$: this.store.pipe(select(Selectors.approval.saving)),
            loaded$: this.store.pipe(select(Selectors.approval.loaded)),
            error$: this.store.pipe(select(Selectors.approval.error)),
            subprojectApproval$: this.store.pipe(select(Selectors.approval.subprojectApproval)),
            approvalHistory$: this.store.pipe(select(Selectors.approval.approvalHistory)),
            reviewCommittees$: this.store.pipe(select(Selectors.approval.reviewCommittees)),
            milestones$: this.store.pipe(select(Selectors.approval.milestones)),
            milestonesLoaded$: this.store.pipe(select(Selectors.approval.milestonesLoaded)),
        },
    };

    private fromBackend = {
        approval: {
            milestones$: this.fromStore.approval.milestonesLoaded$.pipe(
                filter(loaded => !loaded), // only, when data is not loaded
                switchMap(() =>  of(this.getMilestones())), // perform the actual fetch operation
                share(), // make sure, the result is shared in case of multiple subscribers
                startWith(null) // initial value
            )
        }
    };

    public data = {
        loading$: this.fromStore.approval.loading$,
        saving$: this.fromStore.approval.saving$,
        subprojectApproval$: this.fromStore.approval.subprojectApproval$,
        approvalHistory$: this.fromStore.approval.approvalHistory$,
        reviewCommittees$: this.fromStore.approval.reviewCommittees$,
        milestones$: muteFirst(this.fromBackend.approval.milestones$, this.fromStore.approval.milestones$)
    }

    /**
     * Function gets approval data which is needed to show to reviewer.
     * @param mcrProjectID
     * @param mcrSubProjectId
     * @param budID
     */
    public getApprovalData(mcrProjectID: number, mcrSubProjectId: number, budID: number, isSubproject: boolean) {
        if (isSubproject && !!mcrSubProjectId && mcrSubProjectId > 0) {
            this.getSubprojectApproval(mcrSubProjectId);
        }

        if (!isSubproject && !!mcrProjectID && mcrProjectID > 0) {
            this.getApprovalHistory(mcrProjectID);
        }

        this.getReviewCommittees(budID,isSubproject ? mcrSubProjectId : null, isSubproject ? null : mcrProjectID);
    }

    /**
     * Function gets approval data for subproject.
     * @param mcrSubProjectId
     */
    public getSubprojectApproval(mcrSubProjectId: number) {
        this.store.dispatch(new ApprovalActions.ApprovalLoadBeginAction());
        return this.approvalService.getSubprojectApproval(mcrSubProjectId).subscribe( data=> {
                this.store.dispatch(new ApprovalActions.ApprovalLoadSuccessAction(data))
            }
            , error => {
                this.store.dispatch(new ApprovalActions.ApprovalLoadFailureAction(error))
            }
        );
    }

    /**
     * Function gets approval history.
     * @param mcrProjectId
     */
    public getApprovalHistory(mcrProjectId : number) {
        this.store.dispatch(new ApprovalActions.ApprovalHistoryLoadBeginAction());
        return this.approvalService.getApprovalHistory(mcrProjectId).subscribe( data=> {
                let sortedData = !!data ? data.sort( (approval1,approval2) => {
                    if (approval1.mcrSubProjectId < approval2.mcrSubProjectId) return -1;
                    else if (approval1.mcrSubProjectId  > approval2.mcrSubProjectId) return 1;
                    else return 0;
                }): data;
                this.store.dispatch(new ApprovalActions.ApprovalHistoryLoadSuccessAction(sortedData));
            }
            , error => {
                this.store.dispatch(new ApprovalActions.ApprovalHistoryFailureAction(error));
            }
        );
    }

    /**
     * Function gets all review committees
     * @param budID
     */
    public getReviewCommittees(budID: number, mcrSubPrjId? : number, mcrProjectId ? : number) {
        this.store.dispatch(new ApprovalActions.ReviewCommitteesLoadBeginAction());
        return this.approvalService.getReviewCommittees(budID, mcrSubPrjId,mcrProjectId).subscribe( (data: ReviewCommitteeWrapper)=> {
                if (!!data && data.reviewCommittees) {
                    data.reviewCommittees.sort( (reviewCommittee1: ReviewCommittee,reviewCommittee2: ReviewCommittee) => {
                        if (reviewCommittee1.reviewCommittee < reviewCommittee2.reviewCommittee) {
                            return -1;
                        } else if (reviewCommittee1.reviewCommittee > reviewCommittee2.reviewCommittee) {
                            return 1;
                        }

                        return  0;
                    });
                }

                this.store.dispatch(new ApprovalActions.ReviewCommitteesLoadSuccessAction(data))
            }
            , error => {
                this.store.dispatch(new ApprovalActions.ReviewCommitteesLoadFailureAction(error))
            }
        );
    }

    /**
     * Function gets all milestones.
     */
    public getMilestones() {
        this.store.dispatch(new ApprovalActions.MilestoneLoadBeginAction());
        return this.approvalService.getMilestones().subscribe( data=> {
                this.store.dispatch(new ApprovalActions.MilestoneLoadSuccessAction(data));
                return data;
            }
            , error => {
                this.store.dispatch(new ApprovalActions.MilestoneLoadFailureAction(error));
                return error;
            }
        );
    }

    /**
     * Function saves project/subproject approval data.
     * @param approvalData
     */
    public saveApprovalData(approvalData: YapApproval) {
        return new Observable<ApprovalResponse>( subscriber => {
            this.store.dispatch(new ApprovalActions.ApprovalDataSaveBeginAction());

            return this.approvalService.checkApprovalStatus(approvalData).subscribe(data => {
                    this.store.dispatch(new ApprovalActions.ApprovalDataSaveSuccessAction(data));

                    this.handleApprovalCheckResponse(data).subscribe( (canApprove: boolean) => {
                        if (canApprove) {
                            this.store.dispatch(new ApprovalActions.ApprovalDataSaveBeginAction());
                            return this.approvalService.saveSubprojectApproval(approvalData).subscribe( approvalResponse=> {
                                    this.store.dispatch(new ApprovalActions.ApprovalDataSaveSuccessAction(approvalResponse));
                                    subscriber.next(approvalResponse);
                                    this.handleApprovalResponse(approvalResponse);
                                }
                                , error => {
                                    this.store.dispatch(new ApprovalActions.ApprovalDataSaveFailureAction(error));
                                    subscriber.error(error);
                                    this.handleApprovalErrorResponse(error);
                                }
                            );
                        } else {
                            this.store.dispatch(new ApprovalActions.ApprovalDataSaveSuccessAction(data));
                        }
                    });

                }, error => {
                    this.store.dispatch(new ApprovalActions.ApprovalDataSaveFailureAction(error));
                    subscriber.error(error);
                    this.handleApprovalErrorResponse(error);
                }
            );
        });
    }

    /**
     * Function accepts approval response data and show appropriate messages according to status code
     * after calling approval check
     * @param data
     */
    private handleApprovalCheckResponse(data: ApprovalResponse) {
        return new Observable<boolean>( subscriber => {
            if (!data) {
                this.messageDialogService.showConfirmDialog(MESSAGES.OTPPLAN_APPROVAL_CHECK_EXCEPTION_OCCURED_MSG,{
                    okBtnMsg: "OK",
                    cancelBtn: false
                }).subscribe((confirmed: boolean) => {
                    subscriber.next(false);
                });
                return ;
            }

            switch (data.statusCode) {
                case ServiceStatusCode.OTPPLAN_APPROVAL_CHECK_YAP_DATA_EXITS:
                    this.messageDialogService.showConfirmDialog(MESSAGES.OTPPLAN_APPROVAL_CHECK_YAP_DATA_EXITS_MSG).subscribe((confirmed: boolean) => {
                        subscriber.next(confirmed);
                    });
                    break;
                case ServiceStatusCode.OTPPLAN_APPROVAL_CHECK_YAP_APPROVE_DATA:
                    return this.messageDialogService.showConfirmDialog(MESSAGES.OTPPLAN_APPROVAL_CHECK_YAP_APPROVE_DATA_MSG).subscribe((confirmed: boolean) => {
                        subscriber.next(confirmed);
                    });;
                    break;
                case ServiceStatusCode.OTPPLAN_APPROVAL_CHECK_PEP_MILESTONE_UPDATE:
                    this.messageDialogService.showConfirmDialog(MESSAGES.OTPPLAN_APPROVAL_CHECK_PEP_MILSTONE_UPDATE_MSG).subscribe((confirmed: boolean) => {
                        subscriber.next(confirmed);
                    });
                    break;
                case ServiceStatusCode.OTPPLAN_APPROVAL_CHECK_NON_YAP_UPDATE:
                    this.messageDialogService.showConfirmDialog(MESSAGES.OTPPLAN_APPROVAL_CHECK_NON_YAP_UPDATE_MSG,{
                        okBtnMsg: "OK",
                        cancelBtn: false
                    }).subscribe((confirmed: boolean) => {
                        subscriber.next(false);
                    });
                    break;
                case ServiceStatusCode.OTPPLAN_APPROVAL_CHECK_YAP_MILESTONE_UPDATE:
                    this.messageDialogService.showConfirmDialog(MESSAGES.OTPPLAN_APPROVAL_CHECK_YAP_MILESTONE_UPDATE_MSG).subscribe((confirmed: boolean) => {
                        subscriber.next(confirmed);
                    });;
                    break;
                case ServiceStatusCode.OTPPLAN_APPROVAL_CHECK_YAP_NO_COC:
                    this.messageDialogService.showConfirmDialog(MESSAGES.OTPPLAN_APPROVAL_CHECK_YAP_NO_COC_MSG,{
                        okBtnMsg: "OK",
                        cancelBtn: false
                    }).subscribe((confirmed: boolean) => {
                        subscriber.next(false);
                    });
                    break;
                case ServiceStatusCode.OTPPLAN_APPROVAL_CHECK_EXCEPTION_OCCURED:
                    this.messageDialogService.showConfirmDialog(MESSAGES.OTPPLAN_APPROVAL_CHECK_EXCEPTION_OCCURED_MSG,{
                        okBtnMsg: "OK",
                        cancelBtn: false
                    }).subscribe((confirmed: boolean) => {
                        subscriber.next(false);
                    });
                    break;
                default:
                    subscriber.next(false);
                    break;
            }
        })
    }

    /**
     * Function accepts approval response data and show appropriate messages according to status code
     * after calling  YAP approval.
     * @param data
     */
    private handleApprovalResponse(data: ApprovalResponse) {
        switch (data.statusCode) {
            case ServiceStatusCode.OTPPLAN_APPROVAL_FAILURE:
                this.snackBar.error(MESSAGES.OTPPLAN_APPROVAL_FAILURE_MSG)
                break;
            case ServiceStatusCode.OTPPLAN_APPROVAL_SUCCESS:
                this.snackBar.success(MESSAGES.OTPPLAN_APPROVAL_SUCCESS_MSG)
                break;
            case ServiceStatusCode.OTPPLAN_APPROVAL_PEP_MILESTONE_UPDATED:
                this.snackBar.success(MESSAGES.OTPPLAN_APPROVAL_PEP_MILESTONE_UPDATED_MSG)
                break;
            default:
                break;
        }
    }

    /**
     * Function shows error message after calling  YAP approval.
     * @param error
     */
    private handleApprovalErrorResponse(error: any) {
        if (error.error &&
            (
                error.error.errorCode == ServiceErrorCode.OUT_DATED_DATA ||
                error.error.errorCode == ServiceErrorCode.INCORRECT_PARAMS
            )) {

        } else if (error.status == HttpErrorCode.BAD_REQUEST) {
            this.snackBar.error(MESSAGES.OTPPLAN_APPROVAL_CHECK_INVALID_PARAMS_MSG)
        } else {
            this.snackBar.error(MESSAGES.OTPPLAN_APPROVAL_FAILURE_MSG)
        }
    }
}
