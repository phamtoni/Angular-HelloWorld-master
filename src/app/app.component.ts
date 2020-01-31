import {Component, OnInit} from '@angular/core';

@Component({
    selector: 'app-root',
    template: `
        <h1>edit in local </h1>
    `
})
export class AppComponent implements OnInit {
    text: String = 'to ni dep trai vcl';
    boo: Boolean = true;
    num: Number = 8;

    ngOnInit(): void {
        this.hello();
    }


    hello(): void {
        alert("hello to ni");
        this.textconsole();

        this.testpara(this.text);
    }

    hello2() {
        this.textconsole();
    }


    textconsole() {
        console.log("to ni dep trai");
    }

    testpara(a) {
        console.log(a);
    }


}
