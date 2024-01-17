import React, { Component } from 'react';

class ContactUs extends Component {
    constructor(props) {
        super(props);
        this.state = {
            name: '',
            email: '',
            message: ''
        }
    }

    render() 
    {
        
    return (
      <section id="contact">
          <div className="row section-head">
            <div className="ten columns">
              <p className="lead">
              Feel free to contact me for any work or suggestions below
              </p>
            </div>
          </div>
            <form onSubmit={this.handleSubmit.bind(this)}>
                <div>
                    <label htmlFor="name">Name:</label>
                    <input type="text" id="name" value={this.state.name} onChange={this.onNameChange.bind(this)} required />
                </div>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" value={this.state.email} onChange={this.onEmailChange.bind(this)} required />
                </div>
                <div>
                    <label htmlFor="message">Message:</label>
                    <textarea id="message" value={this.state.message} onChange={this.onMessageChange.bind(this)} required />
                </div>
                <button type="submit">Submit</button>
            </form>
        </section>
        );    
    }
    onNameChange(event) {
        this.setState({name: event.target.value })
    }
    onEmailChange(event) {
        this.setState({email: event.target.value })
    }
    onMessageChange(event) {
        this.setState({message: event.target.value })
    }
    handleSubmit(e) {
        e.preventDefault();
        fetch("/api/contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json;charset=utf-8"
            },
            body: JSON.stringify(this.state)
        }).then(response => response.json()).then(response => {
            if (response.status === "Message Sent") {
                alert("Message Sent.")
                this.resetForm()
            }
            else {
                alert("Message failed to send.")
            }
        })
    }
    resetForm() {
        this.setState({ name: '', email: '', message: '' })
    }
}
export default ContactUs;
