import {async, ComponentFixture, inject, TestBed} from '@angular/core/testing';

import {ApprovalComponent} from './approval.component';
import {CommonModule} from "@angular/common";
import {ReactiveFormsModule} from "@angular/forms";
import {SharedModule} from "../../../../shared/shared.module";
import {MatSelectModule} from "@angular/material/select";
import {MatMenuModule} from "@angular/material/menu";
import {BROWSER_LOCALE, BrowserLocaleModule} from "../../../../shared/locale/browser-locale";
import {NoopAnimationsModule} from "@angular/platform-browser/animations";
import {OverlayContainer} from "@angular/cdk/overlay";
import {Platform} from "@angular/cdk/platform";
import {MockApprovalService} from "../../../../../mock/mock-services/mock-approval.service";
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {ApprovalSandboxService} from "./approval-sandbox.service";
import {Observable, of} from "rxjs";
import {
    ApprovalResponse,
    ApprovalService,
    DefaultApprovalService
} from "../../../../shared/business-domain";
import {Store, StoreModule} from "@ngrx/store";
import {SubprojectStateModule} from "../../+state/subproject";
import {ApprovalStoreModule} from "../../+state/approval";
import {CoverageSpecialSalesMaterialModule} from "../../../../shared/material";
import {MatDialogModule} from "@angular/material/dialog";
import {MessageDialogService} from "../../../../shared/dialog";
import {MockDataService} from "../../../../../mock/mock-services/mockDataService.service";

describe('ApprovalComponent', () => {
    let component: ApprovalComponent;
    let fixture: ComponentFixture<ApprovalComponent>;
    let browserLocale: string;

    let overlayContainer: OverlayContainer;
    let overlayContainerElement: HTMLElement;
    let platform: Platform;
    let mockDataService : MockDataService;
    let mockApprovalSandboxService: ApprovalSandboxService;
    let dialogRef: MatDialogRef<ApprovalComponent>;
    let store: Store<any>;
    let approvalService: ApprovalService;
    let messageDialogService: MessageDialogService;

    const mockDialogRef = {
        close: jasmine.createSpy('close')
    };

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                CommonModule,
                ReactiveFormsModule,
                SharedModule,
                MatSelectModule,
                MatMenuModule,
                BrowserLocaleModule,
                NoopAnimationsModule,
                CoverageSpecialSalesMaterialModule,
                StoreModule.forRoot({}),
                SubprojectStateModule,
                MatDialogModule,
                ApprovalStoreModule
            ],
            declarations: [ApprovalComponent],
            providers: [
                MockApprovalService,
                ApprovalSandboxService,
                MockDataService,
                MessageDialogService,
                {provide: ApprovalService,useClass:DefaultApprovalService},
                Store,
                {provide: MatDialogRef, useValue: mockDialogRef},
                {provide: MAT_DIALOG_DATA, useValue: {}}],
        })
            .compileComponents().then();

        inject([OverlayContainer, Platform], (oc: OverlayContainer, p: Platform) => {
            overlayContainer = oc;
            overlayContainerElement = oc.getContainerElement();
            platform = p;
        })();

        mockApprovalSandboxService = TestBed.get(ApprovalSandboxService);
        approvalService = TestBed.get(ApprovalService);
        mockDataService = TestBed.get(MockDataService);
        messageDialogService = TestBed.get(MessageDialogService);

        inject([BROWSER_LOCALE], token => {
            browserLocale = token;
        });

        spyOn(approvalService,'getReviewCommittees').and.returnValue(of(mockDataService.getReviewCommitteeWrapper()));
        spyOn(approvalService,'getSubprojectApproval').and.returnValue(of(mockDataService.getSubprojectApproval()));
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ApprovalComponent);
        store = TestBed.get(Store);
        dialogRef = TestBed.get(MatDialogRef);
        component = fixture.componentInstance;

        const today = new Date("2019-12-20");
        component.subscriptions = [];
        component.data = mockDataService.getApprovalDialogData();
        component.data.mcrProjectId = 1;
        component.data.budId = 2;
        component.subprojectApproval = mockDataService.getSubprojectApproval();
        component.reviewCommitteeWrapper = mockDataService.getReviewCommitteeWrapper();
        component.maxCommentLength = 43;
        component.maxProtocolNoLength = 18;
        component.today = today;
        component.maxDate = today;
        component.minDate = new Date(today.getFullYear() - 101, 12, 1);
        component.canApprove = mockDataService.getApprovalDialogData().canApprove;
        component.approvalHistoryColumns = ['mcrSubProjectId', 'milestone', 'approvalDate', 'cancelled'];
        component.ngOnInit();
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('test onApprove of SubProject Level should be called and responded', () => {
        const approveCompletedEvent = spyOn(component.approveCompletedEvent, 'emit').and.returnValue({});
        const statusCheckResponse: ApprovalResponse = new ApprovalResponse(1011);
        const approvalResponse: ApprovalResponse = new ApprovalResponse(2001);

        spyOn(approvalService, 'checkApprovalStatus').and.returnValue(of(statusCheckResponse));
        spyOn(approvalService, 'saveSubprojectApproval').and.returnValue(of(approvalResponse));
        spyOn(messageDialogService,'showConfirmDialog').and.returnValue(of(true));


        component.onApprove();

        expect(approveCompletedEvent).toHaveBeenCalledWith(approvalResponse);
    });

    it('test onApprove of Project Level should be called and responded', () => {
        component.data.isSubproject = false;

        const approveCompletedEvent = spyOn(component.approveCompletedEvent, 'emit').and.returnValue({});
        const statusCheckResponse: ApprovalResponse = new ApprovalResponse(1011);
        const approvalResponse: ApprovalResponse = new ApprovalResponse(2001);

        spyOn(approvalService, 'getApprovalHistory').and.returnValue(of(mockDataService.getApprovalHistory()));
        spyOn(approvalService, 'checkApprovalStatus').and.returnValue(of(statusCheckResponse));
        spyOn(approvalService, 'saveSubprojectApproval').and.returnValue(of(approvalResponse));
        spyOn(messageDialogService, 'showConfirmDialog').and.returnValue(of(true));

        component.ngOnInit();
        component.onApprove();
        expect(approveCompletedEvent).toHaveBeenCalledWith(approvalResponse);

    });

    it('test onApprove of Project Level should be called and responded with saving errors', () => {
        component.data.isSubproject = false;

        const statusCheckResponse: ApprovalResponse = new ApprovalResponse(1011);

        spyOn(approvalService, 'getApprovalHistory').and.returnValue(of(mockDataService.getApprovalHistory()));
        spyOn(approvalService, 'checkApprovalStatus').and.returnValue(of(statusCheckResponse));
        spyOn(approvalService, 'saveSubprojectApproval').and.returnValue(new Observable(subscriber => subscriber.error("Saving Error")));
        spyOn(messageDialogService, 'showConfirmDialog').and.returnValue(of(true));

        component.ngOnInit();
        component.onApprove();

    });

    it('test onApprove of Project Level should be called and responded with checked status errors', () => {
        component.data.isSubproject = false;

        spyOn(approvalService, 'getApprovalHistory').and.returnValue(of(mockDataService.getApprovalHistory()));
        spyOn(approvalService, 'checkApprovalStatus').and.returnValue(of(new Observable(subscriber => subscriber.error("Checking errors"))));
        spyOn(messageDialogService, 'showConfirmDialog').and.returnValue(of(true));

        component.ngOnInit();
        component.onApprove();
    });

});
