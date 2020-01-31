import {Component, Input, OnInit} from '@angular/core';

@Component({
    selector: 'css-subproject-last-change',
    templateUrl: './subproject-last-change.component.html',
    styleUrls: ['./subproject-last-change.component.scss']
})
export class SubprojectLastChangeComponent implements OnInit {


    @Input() updateDate;
    @Input() updateUser;

    constructor() { }

    ngOnInit() {
    }

}
